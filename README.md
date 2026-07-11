# Tanya's Portfolio AI Chatbot API & Widget

This project is a secure, recruiter-focused AI chatbot integration built for Tanya Singh's Product Designer portfolio on Framer. It acts as an **AI Museum Guide** to help recruiters quickly explore Tanya's UX/UI case studies, design process, skills, and background.

It is structured as a **Vercel Serverless Function** backend proxy to securely communicate with the **Google Gemini API** without exposing API keys to client browsers.

---

## Technical Flow

```
FramerChatWidget.tsx (Framer UI)
       │ (POST request with message & history)
       ▼
Vercel Serverless Endpoint (/api/chat)
       │ (Injects tanya-knowledge.md + System Rules)
       ▼
Google Gemini API (using secure GEMINI_API_KEY env)
       │
       ▼
Returns concise, recruiter-friendly response
```

---

## Project Structure

- `api/chat.js`: Serverless handler containing CORS settings, the 13-question limits checker, and strict museum-guide instructions.
- `tanya-knowledge.md`: The single source of truth containing Tanya's design achievements, case studies, and contact details.
- `FramerChatWidget.tsx`: The premium, glassmorphic React Code Component for Framer.
- `vercel.json`: Global CORS configuration allowing Framer previews and localhosts.
- `package.json`: Configures ESM modules and Google Generative AI SDK dependencies.

---

## 1. Deploying to Vercel

Vercel hosts node functions inside an `api/` directory automatically and is completely free.

### Option A: Using the Vercel Git Integration (Recommended)
1. Push your local `Portfolio` folder to a new private GitHub repository.
2. Log in to [Vercel](https://vercel.com/).
3. Click **Add New** > **Project** and import your GitHub repository.
4. Keep the default settings and click **Deploy**.
5. Vercel will host your project and provide a public URL (e.g., `https://tanya-portfolio.vercel.app`).

### Option B: Using the Vercel CLI
1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Navigate to your project folder in your terminal and run:
   ```bash
   vercel
   ```
3. Follow the interactive prompts to link and deploy your site.

---

## 2. Adding the `GEMINI_API_KEY`

To keep your Gemini key safe from public exposure:

1. Go to [Google AI Studio](https://aistudio.google.com/) and create a free **API Key**.
2. Open your Vercel Project Dashboard.
3. Navigate to **Settings** > **Environment Variables**.
4. Add the following variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: *[Paste your AI Studio API key]*
5. Click **Save**.
6. Trigger a redeploy of your Vercel project (or click **Promote to Production** if needed) to apply the variable.

---

## 3. Connecting to Framer

To add the minimal, premium Chatbot Widget onto your Framer canvas:

1. In **Framer**, go to the **Assets** panel on the left.
2. Scroll to the **Code** category and click the **+ (Add Code)** button.
3. Create a **New Component** named `FramerChatWidget`.
4. Replace all placeholder code in the Framer code editor with the contents of your local [FramerChatWidget.tsx](FramerChatWidget.tsx).
5. Save the file (`Cmd + S` or `Ctrl + S`).
6. Drag the `FramerChatWidget` component from your assets panel and place it onto your portfolio home page.
   *(Since it uses fixed styling, it automatically positions itself at the bottom right corner of the user's viewport).*

### Configuring the Sidebar Controls
When you click on the component in Framer, configure the properties in the right-hand panel:
- **API URL**: Set it to your Vercel API endpoint (e.g. `https://tanya-portfolio.vercel.app/api/chat`).
- **Bot Name**: Change to `"Tanya's Portfolio Guide"`.
- **Greeting**: Edit the opening guide message if desired.
- **Accent Color**: Pick a color matching your theme (default: `#7C3AED`).
- **Avatar URL**: Link a custom photo of yourself or a stylized guide avatar.
- **Quick Prompts**: A scrollable carousel of 13 key questions designed to guide recruiters.

---

## Conversation Limits & AI Rules

- **13 Question Cap**: The API and frontend track the session. Once a visitor asks 13 questions, the API blocks queries and asks them to connect with you directly.
- **Exhibition Assistant Persona**: The chatbot only answers questions related to Tanya's work, experience, and projects. Unrelated prompts are pivoted back. Missing details will output a fallback: *"I don't have that detail in Tanya's portfolio knowledge yet, but you can contact Tanya directly."*

