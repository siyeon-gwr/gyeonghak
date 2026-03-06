// pages/api/search.js
export default function handler(req, res) {
  const { q } = req.query;
  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: "검색어를 입력하세요" });
  }

  try {
    const db = require("../../lib/db").getDb();
    
    // FTS 전문 검색
    const rows = db.prepare(`
      SELECT 
        s.id, s.book_id, s.pn_name, s.gyeongmun, s.jusuk, s.full_text,
        b.name as book_name, b.classic_code
      FROM sections_fts f
      JOIN sections s ON s.id = f.rowid
      JOIN books b ON b.id = s.book_id
      WHERE sections_fts MATCH ?
      LIMIT 50
    `).all(q.trim());

    const results = rows.map((r) => {
      // 검색어 하이라이트
      const text = r.gyeongmun || r.full_text || "";
      const idx = text.indexOf(q);
      let snippet = "";
      if (idx >= 0) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(text.length, idx + q.length + 60);
        snippet = (start > 0 ? "..." : "") + 
          text.slice(start, idx) +
          `<mark style="background:#F0DFA0">${text.slice(idx, idx + q.length)}</mark>` +
          text.slice(idx + q.length, end) +
          (end < text.length ? "..." : "");
      } else {
        snippet = text.slice(0, 100) + (text.length > 100 ? "..." : "");
      }
      return {
        id: r.id,
        book_id: r.book_id,
        book_name: r.book_name,
        pn_name: r.pn_name,
        classic_code: r.classic_code,
        snippet,
      };
    });

    res.json({ results, total: results.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "검색 오류", results: [] });
  }
}
