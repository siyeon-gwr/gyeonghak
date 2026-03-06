// pages/api/search.js
import { getDb } from '../../lib/db';

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: '검색어를 입력하세요' });
  }
  try {
    const supabase = getDb();
    const { data: rows, error } = await supabase
      .from('texts')
      .select('id, classic, hanja, book_title, section, content, source, dynasty, text_type')
      .or(`content.ilike.%${q.trim()}%,classic.ilike.%${q.trim()}%,section.ilike.%${q.trim()}%`)
      .limit(50);

    if (error) throw error;

    const results = (rows || []).map((r) => {
      const text = r.content || '';
      const idx = text.indexOf(q);
      let snippet = '';
      if (idx >= 0) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(text.length, idx + q.length + 60);
        snippet =
          (start > 0 ? '...' : '') +
          text.slice(start, idx) +
          `<mark style="background:#F0DFA0">${text.slice(idx, idx + q.length)}</mark>` +
          text.slice(idx + q.length, end) +
          (end < text.length ? '...' : '');
      } else {
        snippet = text.slice(0, 100) + (text.length > 100 ? '...' : '');
      }
      return {
        id: r.id,
        book_name: r.book_title || r.classic,
        classic: r.classic,
        hanja: r.hanja,
        section: r.section,
        source: r.source,
        dynasty: r.dynasty,
        text_type: r.text_type,
        snippet,
      };
    });

    res.json({ results, total: results.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '검색 오류', results: [] });
  }
}
