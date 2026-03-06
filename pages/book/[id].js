import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function BookPage({ book, sections, classic }) {
  const [fontSize, setFontSize] = useState(18);
  const [showJusuk, setShowJusuk] = useState(true);
  const [activeSection, setActiveSection] = useState(0);

  if (!book) return <div>문헌을 찾을 수 없습니다.</div>;

  const section = sections[activeSection];
  const color = classic?.color || "#4A3728";

  return (
    <>
      <Head>
        <title>{book.name} — 韓國經學資料系統</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#F5F0E8", fontFamily: "'Noto Serif KR', Georgia, serif", color: "#2C2416" }}>
        <header style={{ background: "linear-gradient(135deg, #2C2416 0%, #4A3728 100%)", borderBottom: "3px solid #8B7355", padding: "16px 24px" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#E8DCC8", letterSpacing: 4 }}>韓國經學資料系統</span>
            </Link>
            <nav style={{ fontSize: 13, color: "#A89880" }}>
              <Link href="/" style={{ color: "#A89880", textDecoration: "underline" }}>首頁</Link>
              <span style={{ margin: "0 8px", opacity: 0.4 }}>›</span>
              {classic && <><Link href={`/classic/${classic.code}`} style={{ color: "#A89880", textDecoration: "underline" }}>{classic.name}</Link><span style={{ margin: "0 8px", opacity: 0.4 }}>›</span></>}
              <span>{book.name}</span>
            </nav>
          </div>
        </header>

        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}>
          {/* 사이드바: 편 목록 */}
          <aside style={{ background: "#FDFBF7", border: "1px solid #DDD4C4", borderRadius: 8, overflow: "hidden", height: "fit-content", position: "sticky", top: 24 }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #EDE7D9", fontSize: 13, color: "#8B7355", fontWeight: 600 }}>
              {book.name}
            </div>
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {sections.map((s, i) => (
                <div key={s.id} onClick={() => setActiveSection(i)} style={{
                  padding: "10px 16px", cursor: "pointer", fontSize: 13,
                  borderBottom: "1px solid #F0EBE3",
                  background: i === activeSection ? "#F5F0E8" : "transparent",
                  borderLeft: i === activeSection ? `3px solid ${color}` : "3px solid transparent",
                  color: i === activeSection ? color : "#4A3728",
                  transition: "all 0.15s",
                }}>
                  {s.pn_name || `편 ${i + 1}`}
                </div>
              ))}
            </div>
          </aside>

          {/* 본문 */}
          <main>
            {/* 툴바 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 2 }}>
                {section?.pn_name || book.name}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* AI 분석 버튼 */}
                <Link href={`/ai?book=${book.id}&section=${section?.id}`} style={{
                  background: "#4A3728", color: "#E8DCC8", padding: "7px 14px",
                  borderRadius: 5, textDecoration: "none", fontSize: 13,
                }}>
                  🤖 AI 분석
                </Link>
                <button onClick={() => setShowJusuk(!showJusuk)} style={{
                  background: showJusuk ? "#4A3728" : "transparent",
                  color: showJusuk ? "#E8DCC8" : "#6B5B45",
                  border: "1px solid #8B7355", padding: "6px 14px", borderRadius: 5,
                  cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                }}>
                  註釋 {showJusuk ? "ON" : "OFF"}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} style={btnStyle}>小</button>
                  <span style={{ fontSize: 12, color: "#8B7355", minWidth: 28, textAlign: "center" }}>{fontSize}</span>
                  <button onClick={() => setFontSize(Math.min(28, fontSize + 2))} style={btnStyle}>大</button>
                </div>
              </div>
            </div>

            {/* 본문 + 주석 */}
            <div style={{ display: "grid", gridTemplateColumns: showJusuk && section?.jusuk ? "1fr 1fr" : "1fr", gap: 20 }}>
              {/* 경문 */}
              <div style={{ background: "#FDFBF7", border: "1px solid #DDD4C4", borderRadius: 8, padding: "32px 28px" }}>
                <div style={{ fontSize: 12, color: "#A89880", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #EDE7D9" }}>
                  原文 · 經文
                </div>
                <div style={{ fontSize, lineHeight: 2.2, color: "#2C2416", letterSpacing: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {section?.gyeongmun || section?.full_text || "텍스트 없음"}
                </div>
              </div>

              {/* 주석 */}
              {showJusuk && section?.jusuk && (
                <div style={{ background: "#F5F0E8", border: "1px solid #DDD4C4", borderRadius: 8, padding: "32px 28px" }}>
                  <div style={{ fontSize: 12, color: "#A89880", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #D4C9B5" }}>
                    註釋
                  </div>
                  <div style={{ fontSize: fontSize - 2, lineHeight: 2.0, color: "#4A3728", letterSpacing: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {section.jusuk}
                  </div>
                </div>
              )}
            </div>

            {/* 메타정보 */}
            {book.author && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#FDFBF7", border: "1px solid #EDE7D9", borderRadius: 6, fontSize: 13, color: "#8B7355" }}>
                저자: {book.author} {book.years && `(${book.years})`}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

const btnStyle = {
  background: "transparent", border: "1px solid #C4B8A4", color: "#6B5B45",
  width: 32, height: 32, borderRadius: 5, cursor: "pointer", fontSize: 13,
  fontFamily: "'Noto Serif KR', serif",
};

export async function getStaticPaths() {
  let ids = [];
  try {
    const db = require("../../lib/db").getDb();
    ids = db.prepare("SELECT id FROM books").all().map((b) => ({ params: { id: String(b.id) } }));
  } catch (e) { ids = []; }
  return { paths: ids, fallback: "blocking" };
}

export async function getStaticProps({ params }) {
  const CLASSIC_INFO = {
    A: { code: "A", name: "大學", color: "#2E4057" },
    B: { code: "B", name: "論語", color: "#5C4033" },
    C: { code: "C", name: "孟子", color: "#4A3728" },
    D: { code: "D", name: "中庸", color: "#5B3256" },
    E: { code: "E", name: "詩經", color: "#6B3A5D" },
    F: { code: "F", name: "書經", color: "#2D5F4A" },
    G: { code: "G", name: "易經", color: "#8B5E3C" },
    H: { code: "H", name: "禮記", color: "#4A4A6B" },
    I: { code: "I", name: "春秋", color: "#7A4430" },
    J: { code: "J", name: "孝經", color: "#3D6B6B" },
    K: { code: "K", name: "小學", color: "#3E5641" },
    L: { code: "L", name: "近思錄", color: "#6B5B3E" },
  };

  let book = null, sections = [], classic = null;
  try {
    const db = require("../../lib/db").getDb();
    book = db.prepare("SELECT * FROM books WHERE id = ?").get(params.id);
    if (book) {
      classic = CLASSIC_INFO[book.classic_code] || null;
      sections = db.prepare("SELECT id, pn_name, gyeongmun, jusuk, chars FROM sections WHERE book_id = ? ORDER BY sort_order").all(book.id);
    }
  } catch (e) { book = null; }

  if (!book) return { notFound: true };
  return { props: { book, sections, classic } };
}
