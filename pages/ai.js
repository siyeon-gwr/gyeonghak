import Head from "next/head";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const EXAMPLE_QUESTIONS = [
  "대학의 '格物致知'를 조선 학자들은 어떻게 해석했나?",
  "주자의 '止於至善' 주석과 조선 경학자의 해석 차이는?",
  "역경에서 '乾卦'의 핵심 의미를 설명해줘",
  "정조가 참조한 경학 문헌은 무엇인가?",
];

export default function AiPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "안녕하세요. 韓國經學資料系統 AI 연구 보조입니다. 경전 해석, 학자 비교, 주석 분석 등 경학 연구에 관한 질문을 해주세요." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: userMsg }] }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content || "응답 오류" }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "연결 오류가 발생했습니다." }]);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>AI 경학 연구 보조 — 韓國經學資料系統</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#F5F0E8", fontFamily: "'Noto Serif KR', Georgia, serif", color: "#2C2416", display: "flex", flexDirection: "column" }}>
        <header style={{ background: "linear-gradient(135deg, #2C2416 0%, #4A3728 100%)", borderBottom: "3px solid #8B7355", padding: "16px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#E8DCC8", letterSpacing: 4 }}>韓國經學資料系統</span>
            </Link>
            <span style={{ fontSize: 14, color: "#A89880" }}>🤖 AI 경학 연구 보조</span>
          </div>
        </header>

        <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* 예시 질문 */}
          {messages.length <= 1 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "#8B7355", marginBottom: 10 }}>예시 질문:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)} style={{
                    background: "#FDFBF7", border: "1px solid #DDD4C4", borderRadius: 20,
                    padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#4A3728",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B7355"; e.currentTarget.style.background = "#F5F0E8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#DDD4C4"; e.currentTarget.style.background = "#FDFBF7"; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 대화창 */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, marginBottom: 20, minHeight: 400 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "14px 18px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user" ? "#4A3728" : "#FDFBF7",
                  color: m.role === "user" ? "#E8DCC8" : "#2C2416",
                  border: m.role === "assistant" ? "1px solid #DDD4C4" : "none",
                  fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "14px 18px", background: "#FDFBF7", border: "1px solid #DDD4C4", borderRadius: "16px 16px 16px 4px", color: "#8B7355", fontSize: 14 }}>
                  분석 중...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div style={{ display: "flex", gap: 12, background: "#FDFBF7", border: "1px solid #DDD4C4", borderRadius: 12, padding: "12px 16px" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="경학 연구 질문을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
              rows={2}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontFamily: "inherit", fontSize: 15, color: "#2C2416", resize: "none", lineHeight: 1.6,
              }}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
              background: loading || !input.trim() ? "#C4B8A4" : "#4A3728",
              color: "#E8DCC8", border: "none", borderRadius: 8, padding: "0 20px",
              cursor: loading || !input.trim() ? "default" : "pointer",
              fontSize: 14, fontFamily: "inherit", fontWeight: 600,
              transition: "background 0.2s",
            }}>
              送
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
