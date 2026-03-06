// pages/api/ai.js — Claude API 연결
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 한국경학자료시스템(gyeonghak.com)의 AI 연구 보조입니다.
전문 분야: 조선시대 경학, 사서오경, 성리학, 한국 유학사, 동아시아 철학.

역할:
- 경전 원문 해석 및 설명
- 조선 학자들의 주석 비교 분석
- 학파별 해석 차이 설명
- 연구자의 경학 연구 지원

응답 원칙:
- 한자 원문을 적극 활용하되 한국어로 설명
- 구체적인 학자명, 문헌명, 시대 정보 포함
- 불확실한 내용은 명시적으로 표시
- 학술적이되 접근하기 쉬운 설명`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "messages 필요" });

  try {
    // DB에서 관련 텍스트 검색 (RAG)
    let contextText = "";
    const lastUserMsg = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    
    if (lastUserMsg) {
      try {
        const db = require("../../lib/db").getDb();
        // 간단한 키워드 추출
        const keywords = lastUserMsg.replace(/[??.]/g, "").split(/\s+/).filter((w) => w.length > 1).slice(0, 3);
        
        for (const kw of keywords) {
          const rows = db.prepare(`
            SELECT s.gyeongmun, s.jusuk, b.name as book_name, s.pn_name
            FROM sections_fts f
            JOIN sections s ON s.id = f.rowid
            JOIN books b ON b.id = s.book_id
            WHERE sections_fts MATCH ?
            LIMIT 3
          `).all(kw);
          
          if (rows.length > 0) {
            contextText += "\n\n[관련 경학 텍스트]\n";
            for (const r of rows) {
              contextText += `\n출처: ${r.book_name} ${r.pn_name || ""}\n`;
              if (r.gyeongmun) contextText += `경문: ${r.gyeongmun.slice(0, 200)}\n`;
              if (r.jusuk) contextText += `주석: ${r.jusuk.slice(0, 200)}\n`;
            }
            break;
          }
        }
      } catch (e) {
        // DB 없으면 그냥 진행
      }
    }

    const systemWithContext = contextText
      ? SYSTEM_PROMPT + contextText
      : SYSTEM_PROMPT;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemWithContext,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    res.json({ content: response.content[0]?.text || "" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI 오류", content: "잠시 후 다시 시도해주세요." });
  }
}
