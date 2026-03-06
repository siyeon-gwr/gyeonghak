import { useState, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const CLASSICS = [
  { code: "A", name: "大學", nameKr: "대학", color: "#2E4057" },
  { code: "B", name: "論語", nameKr: "논어", color: "#5C4033" },
  { code: "C", name: "孟子", nameKr: "맹자", color: "#4A3728" },
  { code: "D", name: "中庸", nameKr: "중용", color: "#5B3256" },
  { code: "E", name: "詩經", nameKr: "시경", color: "#6B3A5D" },
  { code: "F", name: "書經", nameKr: "서경", color: "#2D5F4A" },
  { code: "G", name: "易經", nameKr: "역경", color: "#8B5E3C" },
  { code: "H", name: "禮記", nameKr: "예기", color: "#4A4A6B" },
  { code: "I", name: "春秋", nameKr: "춘추", color: "#7A4430" },
  { code: "J", name: "孝經", nameKr: "효경", color: "#3D6B6B" },
  { code: "K", name: "小學", nameKr: "소학", color: "#3E5641" },
  { code: "L", name: "近思錄", nameKr: "근사록", color: "#6B5B3E" },
];

export default function Home({ stats }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [query, router]);

  return (
    <>
      <Head>
        <title>韓國經學資料集成 — gyeonghak.com</title>
        <meta name="description" content="조선시대 경학 원문 및 주석 데이터베이스, AI 경학 도우미" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#F5F0E8", fontFamily: "'Noto Serif KR', Georgia, serif", color: "#2C2416" }}>
        <header style={{
          background: "linear-gradient(135deg, #2C2416 0%, #4A3728 50%, #3D2E1F 100%)",
          borderBottom: "3px solid #8B7355",
          padding: "20px 24px 16px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#E8DCC8", margin: 0, letterSpacing: 6 }}>
                韓國經學資料集成
              </h1>
              <span style={{ fontSize: 13, color: "#A89880", letterSpacing: 2 }}>gyeonghak.com</span>
            </div>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="경전 원문 검색..."
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: "#E8DCC8", padding: "8px 14px", fontSize: 14, width: 220,
                  fontFamily: "inherit",
                }}
              />
              <button onClick={handleSearch} style={{
                background: "rgba(139,115,85,0.4)", border: "none", color: "#E8DCC8",
                padding: "8px 16px", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
              }}>搜</button>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, letterSpacing: 3 }}>經典目錄</h2>
            <p style={{ fontSize: 14, color: "#8B7355", margin: 0 }}>경전을 선택하면 소속 문헌 목록을 볼 수 있다</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {CLASSICS.map((c) => (
              <Link key={c.code} href={`/classic/${c.code}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#FDFBF7", border: "1px solid #DDD4C4", borderRadius: 8,
                  padding: "24px 20px", cursor: "pointer", position: "relative", overflow: "hidden",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = c.color;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 4px 16px ${c.color}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#DDD4C4";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: c.color, borderRadius: "8px 0 0 8px" }} />
                  <div style={{ fontSize: 32, fontWeight: 700, color: c.color, marginBottom: 8, letterSpacing: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 14, color: "#6B5B45", marginBottom: 12 }}>{c.nameKr}</div>
                  <div style={{ fontSize: 12, color: "#A89880" }}>
                    {stats?.[c.code] || 0}册 · {stats?.[`${c.code}_count`] || 0}편
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{
            marginTop: 48, padding: "24px 28px", background: "#FDFBF7",
            border: "1px solid #DDD4C4", borderRadius: 8,
            display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 20,
          }}>
            {[
              { label: "경전 종류", value: 12, unit: "종" },
              { label: "수록 문헌", value: stats?.total_books || 0, unit: "종" },
              { label: "텍스트 수", value: (stats?.total_texts || 0).toLocaleString(), unit: "편" },
              { label: "수록 글자수", value: stats?.total_chars ? `${Math.round(stats.total_chars / 10000)}만` : "0", unit: "자" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#4A3728" }}>
                  {s.value}<span style={{ fontSize: 14, fontWeight: 400, color: "#8B7355" }}> {s.unit}</span>
                </div>
                <div style={{ fontSize: 13, color: "#A89880", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 24, padding: "20px 24px", background: "linear-gradient(135deg, #2C2416, #4A3728)",
            borderRadius: 8, color: "#E8DCC8", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>AI 경학 도우미 시작</div>
              <div style={{ fontSize: 13, color: "#A89880" }}>경문 해석, 저자 탐구, 주석 해설을 AI와 함께</div>
            </div>
            <Link href="/ai" style={{
              background: "#8B7355", color: "#F5F0E8", padding: "10px 20px",
              borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600,
            }}>
              AI 도우미 시작 →
            </Link>
          </div>
        </main>

        <footer style={{ borderTop: "1px solid #DDD4C4", padding: "20px 24px", textAlign: "center", fontSize: 12, color: "#A89880", marginTop: 48 }}>
          한국경학자료집성 gyeonghak.com · 원본 데이터 koco.skku.edu · 중국 위키문헌 연동
        </footer>
      </div>
    </>
  );
}

export async function getStaticProps() {
  let stats = { total_texts: 0, total_books: 0, total_chars: 0 };
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    const { count: total_texts } = await supabase
      .from("texts")
      .select("*", { count: "exact", head: true });

    const { data: charData } = await supabase
      .from("texts")
      .select("char_count");

    const total_chars = (charData || []).reduce((sum, r) => sum + (r.char_count || 0), 0);

    // 경전별 카운트
    const classicStats = {};
    for (const c of ["A","B","C","D","E","F","G","H","I","J","K","L"]) {
      const { count } = await supabase
        .from("texts")
        .select("*", { count: "exact", head: true })
        .eq("source", "korea")
        .ilike("filename", `${c}_%`);
      classicStats[c] = 0;
      classicStats[`${c}_count`] = count || 0;
    }

    stats = { total_texts: total_texts || 0, total_books: 0, total_chars, ...classicStats };
  } catch (e) {
    console.error("stats error:", e);
  }

  return { props: { stats }, revalidate: 3600 };
}
