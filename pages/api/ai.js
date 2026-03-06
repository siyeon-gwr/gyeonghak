// pages/api/ai.js
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../../lib/db';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 한국 경학(經學) 전문 AI입니다. 
조선시대 유학자들의 경전 해석과 주자학(朱子學), 양명학(陽明學)에 정통합니다.
사용자의 질문에 경전 원문과 주석을 근거로 답변하세요.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages 필요' });

  try {
    let contextText = '';
    const lastUserMsg = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || '';

    if (lastUserMsg) {
      try {
        const supabase = getDb();
        const keywords = lastUserMsg
          .replace(/[？。.]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 1)
          .slice(0, 3);

        for (const kw of keywords) {
          const { data: rows } = await supabase
            .from('texts')
            .select('content, book_title, classic, section')
            .ilike('content', `%${kw}%`)
            .limit(3);

          if (rows && rows.length > 0) {
            contextText += '\n\n[관련 경학 텍스트]\n';
            for (const r of rows) {
              contextText += `\n출처: ${r.book_title || r.classic} ${r.section || ''}\n`;
              contextText += `내용: ${r.content.slice(0, 200)}\n`;
            }
            break;
          }
        }
      } catch (e) {
        // DB 없으면 그냥 진행
      }
    }

    const systemWithContext = contextText ? SYSTEM_PROMPT + contextText : SYSTEM_PROMPT;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemWithContext,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    res.json({ content: response.content[0]?.text || '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI 오류', content: '다시 한번 시도해주세요.' });
  }
}
