import Groq from "groq-sdk";
import fs from 'fs';
import path from 'path';

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
    res.status(500).json({
      error: "GROQ_API_KEY missing"
    });
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
- **LinkedIn**: https://www.linkedin.com/in/designedbynitya
- **Contra**: https://contra.com/designedbynitya`
    });
    return;
  }

  try {
    // Dynamically load Tanya's knowledge base from root folder
    const kbPath = path.join(process.cwd(), 'tanya-knowledge.md');
    let knowledgeBase = '';
    try {
      knowledgeBase = fs.readFileSync(kbPath, 'utf8');
    } catch (fileErr) {
      console.error('Error reading knowledge base:', fileErr);
      knowledgeBase = 'Tanya Singh is a Product & UI/UX Designer. Contact: singhtanya20003@gmail.com';
    }

    // Define strict instructions for the virtual agent
    const systemInstruction = `You are Tanya's AI Portfolio Guide, a recruiter-focused AI assistant that helps hiring managers quickly explore and understand Tanya's work.
You act like a smart portfolio or museum guide, NOT a generic personal assistant or general ChatGPT clone.

Here is Tanya's official knowledge base (the ONLY source of truth):
${knowledgeBase}

RULES:
1. ONLY answer questions regarding Tanya's:
   - Portfolio & Design work
   - UX/Product Design projects (e.g., Rentickle account/KYC, Advance payment, Checkout overhaul, Canopy, Pehel)
   - Skills & experience (CS background, Figma, tools)
   - Design philosophy and collaboration style
   - Hiring, availability, or contact information.

2. NEVER invent fake details, companies, metrics, projects, or experience.
   - If the information is missing or not covered in the knowledge base, say exactly:
     "I don't have that detail in Tanya's portfolio knowledge yet, but you can contact Tanya directly."

3. Keep answers RECRUITER-FRIENDLY:
   - Short, clear, and impact-focused.
   - Use bullet points, bold key achievements, and short paragraphs.
   - Avoid long ChatGPT-style blocks of text.

4. Recommend portfolio paths where relevant:
   - If asked "Which project/case study should I see/review?", respond:
     "I recommend starting with Tanya's Rentickle Checkout Redesign case study. It directly shows her ability to handle complex product thinking, reduce user friction, and deliver significant business impact (like a 42% reduction in checkout duration and 2x increase in confirmed orders)."

5. Handle unrelated questions politely and pivot back:
   - If asked to write code, tell a joke, or explain topics unrelated to Tanya's design portfolio (e.g., "Write me Python code"), respond exactly:
     "I'm here to help you explore Tanya's portfolio and design work. For other topics, Tanya would be happy to connect directly."

6. Refer to Tanya in the third person (e.g., "Tanya is...", "She designed...") and speak naturally as her guide. Avoid phrases like "According to the file" or "Based on the knowledge base".`;

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });


    const recentHistoryText = Array.isArray(history)
      ? history
        .slice(-6)
        .map((turn) => {
          const role =
            turn.role === "user"
              ? "Recruiter"
              : "Tanya AI";

          const text =
            turn.message ||
            turn.content ||
            turn.text ||
            "";

          return text.trim()
            ? `${role}: ${text}`
            : "";
        })
        .filter(Boolean)
        .join("\n")
      : "";


    const completion =
      await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",

        messages: [
          {
            role: "system",
            content: systemInstruction,
          },
          {
            role: "user",
            content: `
Previous conversation:
${recentHistoryText}

Question:
${message}
        `,
          },
        ],

        temperature: 0.4,
        max_tokens: 120,
      });


    let responseText =
      completion.choices[0].message.content;

    // If the next question would hit the limit (meaning this response is question 13),
    // append a friendly message letting them know they can connect directly.
    if (totalUserQuestions === 13) {
      responseText += `\n\n---\n*You have reached the maximum of 13 questions for this chat session. For deeper portfolio discussions or opportunities, feel free to contact Tanya at singhtanya20003@gmail.com.*`;
    }

    res.status(200).json({ response: responseText });
  } catch (err) {
    console.error('Error calling GROQ API:', err);
    res.status(500).json({ error: 'Failed to generate response from AI model.', details: err.message });
  }
}
