import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(q || "");

  useEffect(() => {
    if (!q) return;
    setQuery(q);
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => { setResults(data.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [q]);

  const handleSearch = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <Head>
        <title>검색: {q} — 韓國經學資料系統</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#F5F0E8", fontFamily: "'Noto Serif KR', Georgia, serif", color: "#2C2416" }}>
        <header style={{ background: "linear-gradient(135deg, #2C2416 0%, #4A3728 100%)", borderBottom: "3px solid #8B7355", padding: "20px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#E8DCC8", letterSpacing: 6 }}>韓國經學資料系統</span>
            </Link>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="경전 원문 검색..." style={{ background: "transparent", border: "none", outline: "none", color: "#E8DCC8", padding: "8px 14px", fontSize: 14, width: 240, fontFamily: "inherit" }} />
              <button onClick={handleSearch} style={{ background: "rgba(139,115,85,0.4)", border: "none", color: "#E8DCC8", padding: "8px 14px", cursor: "pointer", fontSize: 14 }}>搜</button>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>검색 결과</h2>
            <p style={{ fontSize: 14, color: "#8B7355", margin: 0 }}>
              "{q}" — {loading ? "검색 중..." : `${results.length}건`}
            </p>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#8B7355" }}>검색 중...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#8B7355", background: "#FDFBF7", borderRadius: 8, border: "1px solid #DDD4C4" }}>
              검색 결과가 없습니다.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((r, i) => (
                <Link key={i} href={`/book/${r.book_id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: "#FDFBF7", border: "1px solid #DDD4C4", borderRadius: 8,
                    padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s",
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#8B7355"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#DDD4C4"}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "#2C2416" }}>{r.book_name}</span>
                      {r.pn_name && <span style={{ fontSize: 13, color: "#8B7355" }}>{r.pn_name}</span>}
                    </div>
                    <div style={{ fontSize: 14, color: "#6B5B45", lineHeight: 1.8, letterSpacing: 0.5 }}
                      dangerouslySetInnerHTML={{ __html: r.snippet }} />
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
