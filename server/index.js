// server/index.js
// Render에서 실행. SQLite 파일 하나만 읽음.

const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "..", "gyeonghak.db");

// DB 연결
let db;
try {
  db = new Database(DB_PATH, { readonly: true });
  db.pragma("journal_mode = WAL");
  console.log("DB 연결 완료:", DB_PATH);
} catch (e) {
  console.error("DB 연결 실패:", e.message);
  process.exit(1);
}

app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());

// ─── API ──────────────────────────────────────────────────────

// GET /api/classics
// 전체 경전 목록
app.get("/api/classics", (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, 
      COUNT(DISTINCT b.sj_id) as book_count,
      COALESCE(SUM(s.chars), 0) as total_chars
    FROM classics c
    LEFT JOIN books b ON b.classic_code = c.code
    LEFT JOIN sections s ON s.classic_code = c.code
    WHERE c.origin = 'korean'
    GROUP BY c.code
    ORDER BY c.sort_order
  `).all();
  res.json(rows);
});

// GET /api/classic/:code
// 특정 경전의 문헌 목록 + 장 목록
app.get("/api/classic/:code", (req, res) => {
  const { code } = req.params;

  const classic = db.prepare("SELECT * FROM classics WHERE code = ?").get(code);
  if (!classic) return res.status(404).json({ error: "경전 없음" });

  const books = db.prepare(`
    SELECT b.*, COUNT(s.pn_id) as section_count,
      COALESCE(SUM(s.chars), 0) as total_chars
    FROM books b
    LEFT JOIN sections s ON s.sj_id = b.sj_id
    WHERE b.classic_code = ?
    GROUP BY b.sj_id
    ORDER BY b.volume, b.sj_id
  `).all(code);

  // 이 경전에서 사용된 표준 장 목록
  const chapters = db.prepare(`
    SELECT chapter_std, chapter_name,
      COUNT(DISTINCT sj_id) as book_count,
      SUM(chars) as total_chars
    FROM sections
    WHERE classic_code = ? AND chapter_std IS NOT NULL
    GROUP BY chapter_std
    ORDER BY MIN(sort_order), chapter_std
  `).all(code);

  res.json({ classic, books, chapters });
});

// GET /api/chapter/:code/:chapter
// 장별 집성 뷰 - 핵심 기능
// 해당 경전의 해당 장에 대한 모든 주석 집성
app.get("/api/chapter/:code/:chapter", (req, res) => {
  const { code, chapter } = req.params;
  const chapterDecoded = decodeURIComponent(chapter);

  // 한국 주석 전체
  const korean = db.prepare(`
    SELECT s.pn_id, s.sj_id, s.chapter_name, s.content, s.chars,
      b.name as book_name, b.volume, b.author, b.dynasty
    FROM sections s
    JOIN books b ON b.sj_id = s.sj_id
    WHERE s.classic_code = ? AND s.chapter_std = ?
    ORDER BY b.volume, b.sj_id
  `).all(code, chapterDecoded);

  // 중국 원문 (ctext)
  const rawText = db.prepare(`
    SELECT * FROM chinese_texts
    WHERE classic_code = ? AND chapter_std = ? AND source = 'ctext'
    ORDER BY id
  `).all(code, chapterDecoded);

  // 주자 집주
  const jizhu = db.prepare(`
    SELECT * FROM chinese_texts
    WHERE classic_code = ? AND chapter_std = ?
    AND (source LIKE '%jizhu%' OR source LIKE '%zhangju%')
    ORDER BY id
  `).all(code, chapterDecoded);

  // 기타 중국 주석 (주자어류, 사서대전 등)
  const otherChinese = db.prepare(`
    SELECT * FROM chinese_texts
    WHERE classic_code = ? AND chapter_std = ?
    AND source NOT LIKE '%raw%' AND source != 'ctext'
    AND source NOT LIKE '%jizhu%' AND source NOT LIKE '%zhangju%'
    ORDER BY source, id
  `).all(code, chapterDecoded);

  res.json({
    chapter: chapterDecoded,
    classic_code: code,
    korean,
    chinese: { rawText, jizhu, otherChinese },
    stats: {
      korean_count: korean.length,
      total_chars: korean.reduce((s, r) => s + (r.chars || 0), 0),
    },
  });
});

// GET /api/book/:sj_id
// 문헌 전체 (서지 + 해제 + 모든 섹션)
app.get("/api/book/:sj_id", (req, res) => {
  const { sj_id } = req.params;

  const book = db.prepare(`
    SELECT b.*, c.name_cn as classic_cn, c.name_kr as classic_kr
    FROM books b JOIN classics c ON c.code = b.classic_code
    WHERE b.sj_id = ?
  `).get(sj_id);
  if (!book) return res.status(404).json({ error: "문헌 없음" });

  const sections = db.prepare(`
    SELECT * FROM sections WHERE sj_id = ? ORDER BY sort_order
  `).all(sj_id);

  res.json({ book, sections });
});

// GET /api/search?q=格物致知&classic=A&limit=30
// 전문 검색 (FTS5)
app.get("/api/search", (req, res) => {
  const { q, classic, limit = 30, offset = 0 } = req.query;
  if (!q || q.trim().length < 1) return res.json({ results: [], total: 0 });

  const query = q.trim().replace(/['"*]/g, "");

  try {
    let sql = `
      SELECT f.pn_id, f.sj_id, f.classic_code, f.chapter_name, f.book_name,
        snippet(sections_fts, 5, '<mark>', '</mark>', '...', 20) as snippet,
        rank
      FROM sections_fts f
      WHERE sections_fts MATCH ?
    `;
    const params = [query];

    if (classic) {
      sql += " AND f.classic_code = ?";
      params.push(classic);
    }

    sql += ` ORDER BY rank LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const results = db.prepare(sql).all(...params);

    // 중국 원전도 검색
    let chineseSql = `
      SELECT f.id, f.source, f.classic_code, f.chapter_name, f.title,
        snippet(chinese_fts, 5, '<mark>', '</mark>', '...', 20) as snippet,
        rank
      FROM chinese_fts f
      WHERE chinese_fts MATCH ?
    `;
    const chineseParams = [query];
    if (classic) {
      chineseSql += " AND f.classic_code = ?";
      chineseParams.push(classic);
    }
    chineseSql += " ORDER BY rank LIMIT 10";
    const chineseResults = db.prepare(chineseSql).all(...chineseParams);

    res.json({ results, chineseResults, total: results.length });
  } catch (e) {
    res.status(400).json({ error: "검색 오류: " + e.message });
  }
});

// GET /api/stats
// 전체 통계
app.get("/api/stats", (req, res) => {
  const stats = {
    books: db.prepare("SELECT COUNT(*) as n FROM books").get().n,
    sections: db.prepare("SELECT COUNT(*) as n FROM sections").get().n,
    total_chars: db.prepare("SELECT COALESCE(SUM(chars),0) as n FROM sections").get().n,
    chinese_texts: db.prepare("SELECT COUNT(*) as n FROM chinese_texts").get().n,
    classics: db.prepare("SELECT COUNT(*) as n FROM classics").get().n,
  };
  res.json(stats);
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});
