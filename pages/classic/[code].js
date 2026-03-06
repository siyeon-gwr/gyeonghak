import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useCallback } from "react";

const CLASSIC_INFO = {
  A: { name: "大學", nameKr: "대학", color: "#2E4057" },
  B: { name: "論語", nameKr: "논어", color: "#5C4033" },
  C: { name: "孟子", nameKr: "맹자", color: "#4A3728" },
  D: { name: "中庸", nameKr: "중용", color: "#5B3256" },
  E: { name: "詩經", nameKr: "시경", color: "#6B3A5D" },
  F: { name: "書經", nameKr: "서경", color: "#2D5F4A" },
  G: { name: "易經", nameKr: "역경", color: "#8B5E3C" },
  H: { name: "禮記", nameKr: "예기", color: "#4A4A6B" },
  I: { name: "春秋", nameKr: "춘추", color: "#7A4430" },
  J: { name: "孝經", nameKr: "효경", color: "#3D6B6B" },
  K: { name: "小學", nameKr: "소학", color: "#3E5641" },
  L: { name: "近思錄", nameKr: "근사록", color: "#6B5B3E" },
};

export default function ClassicPage({ classic, books }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [query, router]);

  if (!classic) return <div>경전을 찾을 수 없습니다.</div>;

  return (
    <>
      <Head>
        <title>{classic.name} {classic.nameKr} — 韓國經學資料系統</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#F5F0E8", fontFamily: "'Noto Serif KR', Georgia, serif", color: "#2C2416" }}>
        <header style={{ background: "linear-gradient(135deg, #2C2416 0%, #4A3728 100%)", borderBottom: "3px solid #8B7355", padding: "20px 24px 16px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#E8DCC8", margin: 0, letterSpacing: 6, cursor: "pointer" }}>韓國經學資料系統</h1>
              </Link>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="경전 원문 검색..." style={{ background: "transparent", border: "none", outline: "none", color: "#E8DCC8", padding: "8px 14px", fontSize: 14, width: 200, fontFamily: "inherit" }} />
                <button onClick={handleSearch} style={{ background: "rgba(139,115,85,0.4)", border: "none", color: "#E8DCC8", padding: "8px 14px", cursor: "pointer", fontSize: 14 }}>搜</button>
              </div>
            </div>
            <nav style={{ marginTop: 10, fontSize: 13, color: "#A89880" }}>
              <Link href="/" style={{ color: "#A89880", textDecoration: "underline" }}>首頁</Link>
              <span style={{ margin: "0 8px", opacity: 0.4 }}>›</span>
              <span>{classic.name} {classic.nameKr}</span>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 28, borderBottom: `2px solid ${classic.color}`, paddingBottom: 16 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: classic.color, margin: 0, letterSpacing: 4 }}>{classic.name}</h2>
            <span style={{ fontSize: 16, color: "#6B5B45" }}>{classic.nameKr}</span>
            <span style={{ fontSize: 13, color: "#A89880" }}>{books.length}册 수록</span>
          </div>

          {books.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#8B7355", background: "#FDFBF7", borderRadius: 8, border: "1px solid #DDD4C4" }}>
              <p style={{ fontSize: 16, margin: "0 0 8px" }}>데이터 수집 예정</p>
              <p style={{ fontSize: 13, color: "#A89880", margin: 0 }}>크롤링 후 업데이트됩니다</p>
            </div>
          ) : (
            <div style={{ background: "#FDFBF7", border: "1px solid #DDD4C4", borderRadius: 8, overflow: "hidden" }}>
              {books.map((book, i) => (
                <Link key={book.id} href={`/book/${book.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "16px 24px", borderBottom: i < books.length - 1 ? "1px solid #EDE7D9" : "none",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                    transition: "background 0.15s", color: "#2C2416",
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#F5F0E8"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontSize: 12, color: "#A89880", minWidth: 50, fontFamily: "monospace" }}>{book.volume || book.sj_id}</span>
                      <span style={{ fontSize: 16, fontWeight: 500 }}>{book.name}</span>
                      {book.author && <span style={{ fontSize: 13, color: "#8B7355" }}>{book.author}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, color: "#A89880" }}>{book.section_count}편</span>
                      <span style={{ fontSize: 12, color: "#C4B8A4" }}>→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export async function getStaticPaths() {
  const codes = ["A","B","C","D","E","F","G","H","I","J","K","L"];
  return { paths: codes.map((c) => ({ params: { code: c } })), fallback: false };
}

export async function getStaticProps({ params }) {
  const { code } = params;
  const classic = CLASSIC_INFO[code] || null;
  let books = [];

  try {
    const db = require("../../lib/db").getDb();
    books = db.prepare(`
      SELECT b.*, COUNT(s.id) as section_count
      FROM books b LEFT JOIN sections s ON s.book_id = b.id
      WHERE b.classic_code = ?
      GROUP BY b.id
      ORDER BY b.sj_id
    `).all(code);
  } catch (e) {
    books = [];
  }

  return { props: { classic, books } };
}
