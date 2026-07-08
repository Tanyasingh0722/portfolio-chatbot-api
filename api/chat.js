import { knowledgeBase } from './knowledge.js';

export default async function handler(req, res) {

  // Always add CORS headers for Framer/browser
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );


  // Browser preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow only POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server. Please add it to your environment variables.' });
    return;
  }

  const { message, history } = req.body || {};
  if (!message) {
    res.status(400).json({ error: 'Missing message in request body.' });
    return;
  }

  // Enforce stateless 13-question conversation limit
  // Count the number of user messages in the history, plus the current message.
  const userMessagesInHistory = Array.isArray(history)
    ? history.filter(turn => turn.role === 'user').length
    : 0;
  const totalUserQuestions = userMessagesInHistory + 1;

  if (totalUserQuestions > 13) {
    res.status(200).json({
      response: `You've explored a lot of Tanya's work. For deeper portfolio discussions, opportunities, or collaboration, you can connect with Tanya directly:

- **Email**: singhtanya20003@gmail.com
- **LinkedIn**: https://www.linkedin.com/in/tanyasingh20003/`
    });
    return;
  }

  try {
    // Knowledge base is imported from knowledge.js (bundled by Vercel)

    // Define strict instructions for the virtual agent
    const systemInstruction = `
You are Tanya's Portfolio Guide.

Your role:
Help recruiters quickly understand Tanya Singh's work.

You are NOT:
- a resume writer
- a salesperson
- a marketing assistant
- Tanya herself

Speak like a design teammate who knows Tanya's work.

Official portfolio information:
${knowledgeBase}


RESPONSE LENGTH RULE (VERY IMPORTANT):

Every answer must be SHORT.

Default:
2-4 sentences maximum.

Only use bullet points when comparing projects.

Never give more than 3 bullet points.

Recruiters spend less than a minute here.
Help them decide quickly.


WRITING STYLE:

Write like a human conversation.

Avoid:
- "excellent hire"
- "unique blend"
- "proven track record"
- "forefront of innovation"
- "delivering measurable impact"

Avoid repeating numbers everywhere.

Do not list every achievement.

Pick only the most relevant detail for the question.


GOOD EXAMPLE:

Question:
Why should we hire Tanya?

Answer:
"Tanya is a product designer who connects user problems, business needs, and technical constraints.

She has worked on e-commerce experiences, internal SaaS tools, and design systems while collaborating closely with product and engineering teams.

She is also exploring AI workflows and design engineering to improve how products are built."


BAD EXAMPLE:

"Tanya has a powerful combination of skills with proven measurable impact including X%, Y%, Z%..."


DESIGN PROCESS:

If asked about process:

Answer:

"Tanya doesn't follow one fixed design framework for every project. She adapts based on the problem, timeline, and team.

Usually she starts by understanding user pain points and business goals, discusses constraints with PMs and developers, explores solutions, gets feedback, and improves from there."


CASE STUDIES:

If asked about projects:

Use:

Project:
Problem:
What Tanya did:
Impact:

Keep each line short.


IMPACT QUESTIONS:

Mention metrics only when the user specifically asks about results or impact.

Do not put metrics in every answer.


COLLABORATION QUESTIONS:

If asked about developers:

Say:

"Tanya's computer science background helps her collaborate better with developers.

She thinks in components, understands technical constraints, and focuses on creating designs that can actually be shipped."


PERSONAL QUESTIONS:

If asked about private life or unrelated topics:

Reply:

"I'm here to help you explore Tanya's design work and portfolio. For anything else, you can connect with Tanya directly."


Always talk about Tanya in third person.
`;

    // Format chat history for Groq (OpenAI-compatible format)
    // Framer sends {role: "user" | "model", message: string}
    // Groq expects {role: "user" | "assistant", content: string}
    const formattedHistory = [];
    if (Array.isArray(history)) {
      for (const turn of history) {
        const role = turn.role === 'user' ? 'user' : 'assistant';
        const content = (turn.message || turn.content || turn.text || '').trim();
        if (!content) continue;
        // Merge consecutive same-role messages
        const previous = formattedHistory[formattedHistory.length - 1];
        if (previous && previous.role === role) {
          previous.content += `\n\n${content}`;
        } else {
          formattedHistory.push({ role, content });
        }
      }
    }

    // Build the messages array for Groq
    const messages = [
      { role: 'system', content: systemInstruction },
      ...formattedHistory,
      { role: 'user', content: message },
    ];

    // Call Groq API (OpenAI-compatible endpoint)
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      const errMsg = data?.error?.message || `Groq API error (status ${groqResponse.status})`;
      throw new Error(errMsg);
    }

    let responseText = data?.choices?.[0]?.message?.content || '';

    if (!responseText.trim()) {
      throw new Error('Groq returned an empty response.');
    }

    // If the next question would hit the limit (meaning this response is question 13),
    // append a friendly message letting them know they can connect directly.
    if (totalUserQuestions === 13) {
      responseText += `\n\n---\n*You have reached the maximum of 13 questions for this chat session. For deeper portfolio discussions or opportunities, feel free to contact Tanya at singhtanya20003@gmail.com.*`;
    }

    res.status(200).json({ response: responseText });
  } catch (err) {
    console.error('Error calling Groq API:', err);
    res.status(500).json({ error: 'Failed to generate response from AI model.', details: err.message });
  }
}
