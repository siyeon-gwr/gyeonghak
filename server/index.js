// server/index.js
const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "..", "gyeonghak.db");

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

function chapterSortKey(name) {
  const m = name.match(/([經傳]?)(\d+)章/);
  if (!m) return 999;
  const prefix = m[1] === '經' ? 0 : m[1] === '傳' ? 100 : 200;
  return prefix + parseInt(m[2]);
}

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

  const chaptersRaw = db.prepare(`
    SELECT chapter_std, chapter_name,
      COUNT(DISTINCT sj_id) as book_count,
      SUM(chars) as total_chars
    FROM sections
    WHERE classic_code = ? AND chapter_std IS NOT NULL
    GROUP BY chapter_std
  `).all(code);

  const chapters = chaptersRaw.sort((a, b) =>
    chapterSortKey(a.chapter_std) - chapterSortKey(b.chapter_std)
  );

  res.json({ classic, books, chapters });
});

app.get("/api/chapter/:code/:chapter", (req, res) => {
  const { code, chapter } = req.params;
  const chapterDecoded = decodeURIComponent(chapter);

  const korean = db.prepare(`
    SELECT s.pn_id, s.sj_id, s.chapter_name, s.content, s.chars,
      b.name as book_name, b.volume, b.author, b.dynasty
    FROM sections s
    JOIN books b ON b.sj_id = s.sj_id
    WHERE s.classic_code = ? AND s.chapter_std = ?
    ORDER BY b.volume, b.sj_id
  `).all(code, chapterDecoded);

  const rawText = db.prepare(`
    SELECT * FROM chinese_texts
    WHERE classic_code = ? AND chapter_std = ? AND source = 'ctext'
    ORDER BY id
  `).all(code, chapterDecoded);

  const jizhu = db.prepare(`
    SELECT * FROM chinese_texts
    WHERE classic_code = ? AND chapter_std = ?
    AND (source LIKE '%jizhu%' OR source LIKE '%zhangju%')
    ORDER BY id
  `).all(code, chapterDecoded);

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

app.get("/api/search", (req, res) => {
  const { q, classic, limit = 30, offset = 0 } = req.query;
  if (!q || q.trim().length < 1) return res.json({ results: [], total: 0 });
  const query = q.trim().replace(/['"*]/g, "");
  try {
    let sql = `
      SELECT f.pn_id, f.sj_id, f.classic_code, f.chapter_name, f.book_name,
        snippet(sections_fts, 5, '<mark>', '</mark>', '...', 20) as snippet, rank
      FROM sections_fts f WHERE sections_fts MATCH ?
    `;
    const params = [query];
    if (classic) { sql += " AND f.classic_code = ?"; params.push(classic); }
    sql += ` ORDER BY rank LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
    const results = db.prepare(sql).all(...params);

    let csql = `
      SELECT f.id, f.source, f.classic_code, f.chapter_name, f.title,
        snippet(chinese_fts, 5, '<mark>', '</mark>', '...', 20) as snippet, rank
      FROM chinese_fts f WHERE chinese_fts MATCH ?
    `;
    const cp = [query];
    if (classic) { csql += " AND f.classic_code = ?"; cp.push(classic); }
    csql += " ORDER BY rank LIMIT 10";
    const chineseResults = db.prepare(csql).all(...cp);

    res.json({ results, chineseResults, total: results.length });
  } catch (e) {
    res.status(400).json({ error: "검색 오류: " + e.message });
  }
});

app.get("/api/stats", (req, res) => {
  res.json({
    books: db.prepare("SELECT COUNT(*) as n FROM books").get().n,
    sections: db.prepare("SELECT COUNT(*) as n FROM sections").get().n,
    total_chars: db.prepare("SELECT COALESCE(SUM(chars),0) as n FROM sections").get().n,
    chinese_texts: db.prepare("SELECT COUNT(*) as n FROM chinese_texts").get().n,
    classics: db.prepare("SELECT COUNT(*) as n FROM classics").get().n,
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});
