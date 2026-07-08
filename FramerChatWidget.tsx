import * as React from "react";
import { addPropertyControls, ControlType } from "framer";

// Define the interface for props configurable within the Framer UI sidebar
interface ChatWidgetProps {
  apiUrl: string;
  botName: string;
  greeting: string;
  accentColor: string;
  botAvatar: string;
  placeholderText: string;
  quickQuestions: string[];
  fabGif: string;
}

export default function FramerChatWidget(props: ChatWidgetProps) {
  const {
    apiUrl = "https://portfolio-chatbot-prfuw2u6l-singhtanya20003-4520s-projects.vercel.app/api/chat",
    botName = "ASK TANYA ✦",
    greeting = "Hi, I'm Tanya's AI twin. Ask me anything — my work, process, or what makes me tick.",
    accentColor = "#000000",
    botAvatar = "",
    placeholderText = "Ask something",
    fabGif = "",
    quickQuestions = [
      "Tell me about Tanya",
      "See case studies",
      "Why should we hire Tanya?",
      "Which case study should I review first?",
      "Show Tanya's biggest product impact",
      "Explain her design process",
      "What products has Tanya designed?",
      "Tell me about SaaS experience",
      "Tell me about e-commerce experience",
      "How does Tanya collaborate with developers?",
      "What are Tanya's AI design skills?",
      "What is Tanya learning currently?",
      "Is Tanya open to opportunities?",
      "How can I contact Tanya?"
    ]
  } = props;

  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<{ role: "user" | "model"; message: string }[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(true);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatWindowRef = React.useRef<HTMLDivElement>(null);

  // Initialize chat with default greeting
  React.useEffect(() => {
    if (messages.length === 0 && greeting) {
      setMessages([{ role: "model", message: greeting }]);
    }
  }, [greeting]);

  // Smooth scroll to the latest message
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Hide the call-to-action tooltip after 8 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Handle closing when clicking outside the widget
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".chat-toggle-btn")
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Count user questions (maximum allowed is 13)
  const userQuestionsCount = messages.filter(msg => msg.role === "user").length;
  const isLimitReached = userQuestionsCount >= 13;

  // Get the top 3 suggestions to show — pick contextually from the quickQuestions list
  const getTopSuggestions = (): string[] => {
    // Filter out questions that the user has already asked
    const askedQuestions = messages
      .filter(msg => msg.role === "user")
      .map(msg => msg.message.toLowerCase());

    const remaining = quickQuestions.filter(
      q => !askedQuestions.includes(q.toLowerCase())
    );

    // Return top 3 remaining (these are ordered by recruiter priority)
    return remaining.slice(0, 3);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isLimitReached) return;

    const userMsg = text.trim();
    const newMessages = [...messages, { role: "user" as const, message: userMsg }];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMsg,
          history: newMessages.slice(0, -1),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Parse specific error from API
        const errDetail = data?.details || data?.error || "";
        if (errDetail.toLowerCase().includes("rate limit")) {
          throw new Error("rate_limit");
        }
        throw new Error(errDetail || "Failed to connect to API");
      }

      if (data.response) {
        setMessages((prev) => [...prev, { role: "model", message: data.response }]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      console.error("Chatbot API Error:", error);
      const errMsg = error?.message || "";
      let userMessage: string;

      if (errMsg === "rate_limit") {
        userMessage = "I'm getting a lot of questions right now and need a short break. Please try again in a minute or two! Alternatively, contact Tanya directly at singhtanya20003@gmail.com.";
      } else {
        userMessage = "I'm having trouble connecting right now. Please try again in a moment, or contact Tanya directly at singhtanya20003@gmail.com.";
      }

      setMessages((prev) => [
        ...prev,
        { role: "model", message: userMessage }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Custom dependency-free Markdown formatter (handles **bold** and - bullet points)
  const renderMessageContent = (text: string) => {
    if (!text) return "";
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;
      const trimmed = line.trim();

      // Check if it's a bullet point
      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
      if (isBullet) {
        const bulletText = trimmed.substring(2);
        content = (
          <li style={{ marginLeft: "12px", marginBottom: "4px", fontFamily: "'Roboto Serif', Georgia, serif" }}>
            {parseInlineMarkdown(bulletText)}
          </li>
        );
      } else {
        content = parseInlineMarkdown(line);
      }

      return (
        <div key={idx} style={{ margin: "4px 0", minHeight: line === "" ? "10px" : "auto" }}>
          {content}
        </div>
      );
    });
  };

  const parseInlineMarkdown = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} style={{ fontWeight: 700, color: "#1A1A1A", fontFamily: "'Roboto Serif', Georgia, serif" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Determine if we should show suggestions (after the last bot reply, not while loading)
  const shouldShowSuggestions = !isLimitReached && !isLoading && messages.length > 0 && messages[messages.length - 1].role === "model";
  const suggestions = shouldShowSuggestions ? getTopSuggestions() : [];

  // Check if it's the initial greeting state (only 1 message, the greeting)
  const isInitialState = messages.length === 1 && messages[0].role === "model";

  return (
    <div style={containerStyle}>
      {/* Dynamic CSS styles injected directly into document */}
      <style dangerouslySetInnerHTML={{ __html: customAnimationsAndStyles(accentColor) }} />

      {/* Floating Action Button & Welcome Tooltip */}
      {!isOpen && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {showTooltip && (
            <div className="chat-tooltip" style={tooltipStyle}>
              Ask me about Tanya's design work!
              <div style={tooltipArrowStyle} />
            </div>
          )}
          <button
            onClick={() => {
              setIsOpen(true);
              setShowTooltip(false);
            }}
            className="chat-toggle-btn"
            style={{
              ...toggleButtonStyle,
              backgroundColor: "transparent",
              padding: 0,
              overflow: "hidden",
            }}
            aria-label="Open Chatbot Guide"
          >
            {fabGif ? (
              <img
                src={fabGif}
                alt="Chat"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.9021 3.59005 15.6667 4.59852 17.1197L3.03362 20.2495C2.86877 20.5792 3.12356 20.9659 3.48624 20.9329L7.33235 20.5833C8.75677 20.8546 10.3333 21 12 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div ref={chatWindowRef} style={chatWindowStyle} className="chat-window-fadein">

          {/* ─── Ambient Gradient Blobs (always visible background) ─── */}
          <div className="ambient-blob blob-1" />
          <div className="ambient-blob blob-2" />
          <div className="ambient-blob blob-3" />


          {/* Header */}
          <div style={headerStyle}>
            <div style={headerLeftStyle}>
              <span style={botNameStyle}>{botName}</span>
            </div>
            <div style={headerRightStyle}>
              {/* Dot indicator row */}
              <div style={dotRowStyle}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} style={headerDotStyle} />
                ))}
              </div>
              {/* Question Counter */}
              <div
                style={{
                  ...counterIndicatorStyle,
                  color: isLimitReached ? "#C53030" : "#888888",
                }}
                title="Remaining questions in this session"
              >
                {isLimitReached ? (
                  <span style={{ color: "#C53030", fontWeight: 600 }}>0 left</span>
                ) : (
                  `${Math.max(0, 13 - userQuestionsCount)} left`
                )}
              </div>
            </div>
          </div>

          {/* Messages Body */}
          <div style={messagesAreaStyle} className="custom-scrollbar">

            {/* Initial greeting state — centered with blobs visible behind */}
            {isInitialState ? (
              <div style={greetingCenteredStyle}>
                <div style={greetingTextStyle}>
                  {messages[0].message}
                </div>
                {/* Initial suggestion pills */}
                {shouldShowSuggestions && suggestions.length > 0 && (
                  <div style={greetingSuggestionsStyle}>
                    {suggestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(q)}
                        className="quick-chip"
                        style={chipStyle}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Conversation messages */
              <>
                {messages.map((msg, index) => (
                  <div key={index} style={{
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  }}>
                    {/* User message — right-aligned bubble */}
                    {msg.role === "user" ? (
                      <div style={userBubbleStyle}>
                        {msg.message}
                      </div>
                    ) : (
                      /* Bot reply — left-aligned clean text with label */
                      <>
                        <div style={roleLabelStyle}>ASK TANYA</div>
                        <div
                          style={{
                            ...messageContentStyle,
                            fontFamily: "'Roboto Serif', Georgia, serif",
                          }}
                        >
                          {renderMessageContent(msg.message)}
                        </div>
                      </>
                    )}

                    {/* Show suggestion pills right after last bot reply */}
                    {msg.role === "model" && index === messages.length - 1 && shouldShowSuggestions && suggestions.length > 0 && (
                      <div style={suggestionsContainerStyle}>
                        {suggestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(q)}
                            className="quick-chip"
                            style={chipStyle}
                          >
                            {q} →
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading State — clean animated bar */}
                {isLoading && (
                  <div style={{ position: "relative", zIndex: 2, padding: "12px 0" }}>
                    <div style={roleLabelStyle}>ASK TANYA</div>
                    <div className="loading-bar-container">
                      <div className="loading-bar" />
                    </div>
                    <div style={loadingTitleStyle}>Working on your answer.</div>
                    <div style={loadingSubtitleStyle}>This might take a moment</div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <div style={inputFooterStyle}>
            <form onSubmit={handleFormSubmit} style={inputAreaStyle}>
              <div style={inputWrapperStyle}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isLimitReached ? "Conversation limit reached." : placeholderText}
                  disabled={isLoading || isLimitReached}
                  style={{
                    ...inputFieldStyle,
                    cursor: isLimitReached ? "not-allowed" : "text",
                    opacity: isLimitReached ? 0.5 : 1,
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || isLimitReached || !inputValue.trim()}
                  style={{
                    ...sendButtonStyle,
                    opacity: isLimitReached ? 0.3 : 1,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </form>
            <div style={disclaimerStyle}>Ask AI can make mistakes.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Framer property panel configuration
addPropertyControls(FramerChatWidget, {
  apiUrl: {
    type: ControlType.String,
    title: "API URL",
    defaultValue: "https://portfolio-chatbot-prfuw2u6l-singhtanya20003-4520s-projects.vercel.app/api/chat",
    description: "The Vercel endpoint hosting your api/chat.js endpoint.",
  },
  botName: {
    type: ControlType.String,
    title: "Bot Name",
    defaultValue: "ASK TANYA ✦",
  },
  greeting: {
    type: ControlType.String,
    title: "Greeting",
    defaultValue: "Hi, I'm Tanya's AI twin. Ask me anything — my work, process, or what makes me tick.",
  },
  accentColor: {
    type: ControlType.Color,
    title: "Accent Color",
    defaultValue: "#000000",
  },
  botAvatar: {
    type: ControlType.String,
    title: "Avatar URL",
    defaultValue: "",
  },
  placeholderText: {
    type: ControlType.String,
    title: "Placeholder",
    defaultValue: "Ask something",
  },
  fabGif: {
    type: ControlType.Image,
    title: "FAB GIF",
  },
  quickQuestions: {
    type: ControlType.Array,
    title: "Quick Prompts",
    control: {
      type: ControlType.String,
    },
    defaultValue: [
      "Tell me about Tanya",
      "See case studies",
      "Why should we hire Tanya?",
      "Which case study should I review first?",
      "Show Tanya's biggest product impact",
      "Explain her design process",
      "What products has Tanya designed?",
      "Tell me about SaaS experience",
      "Tell me about e-commerce experience",
      "How does Tanya collaborate with developers?",
      "What are Tanya's AI design skills?",
      "What is Tanya learning currently?",
      "Is Tanya open to opportunities?",
      "How can I contact Tanya?"
    ]
  }
});

// ─── React Inline Styles ────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "24px",
  right: "24px",
  zIndex: 9999,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  color: "#1A1A1A",
  padding: "10px 16px",
  borderRadius: "14px",
  fontSize: "12px",
  fontWeight: 500,
  fontFamily: "'Inter', sans-serif",
  marginBottom: "12px",
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
  position: "relative",
  animation: "fadeIn 0.4s ease-out",
  whiteSpace: "nowrap",
};

const tooltipArrowStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "-6px",
  right: "22px",
  width: "10px",
  height: "10px",
  backgroundColor: "#FFFFFF",
  borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
  borderRight: "1px solid rgba(0, 0, 0, 0.06)",
  transform: "rotate(45deg)",
};

const toggleButtonStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  border: "none",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  outline: "none",
};

const chatWindowStyle: React.CSSProperties = {
  width: "358px",
  height: "calc(100vh - 100px)",
  maxHeight: "700px",
  borderRadius: "24px",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  backgroundColor: "#FAFAFA",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.03)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  maxWidth: "calc(100vw - 48px)",
  position: "relative",
};

const headerStyle: React.CSSProperties = {
  padding: "18px 20px 6px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  position: "relative",
  zIndex: 5,
};

const headerLeftStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const headerRightStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "8px",
};

const dotRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "4px",
  alignItems: "center",
};

const headerDotStyle: React.CSSProperties = {
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  backgroundColor: "#1A1A1A",
};

const botNameStyle: React.CSSProperties = {
  fontFamily: "'Roboto Serif', Georgia, 'Times New Roman', serif",
  fontWeight: 700,
  fontSize: "15px",
  color: "#1A1A1A",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const counterIndicatorStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#888888",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  letterSpacing: "0.02em",
};

const messagesAreaStyle: React.CSSProperties = {
  flex: 1,
  padding: "16px 22px 8px 22px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "22px",
  position: "relative",
  zIndex: 2,
};

// ─── Greeting (initial centered state) ──────────────────────────

const greetingCenteredStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  alignItems: "center",
  textAlign: "center",
  padding: "0 8px 16px 8px",
  position: "relative",
  zIndex: 2,
};

const greetingTextStyle: React.CSSProperties = {
  fontFamily: "'Roboto Serif', Georgia, serif",
  fontSize: "17px",
  lineHeight: 1.6,
  color: "#555555",
  fontWeight: 400,
  maxWidth: "280px",
  marginBottom: "20px",
};

const greetingSuggestionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "8px",
};

// ─── Conversation Styles ────────────────────────────────────────

const roleLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  color: "#AAAAAA",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "6px",
  fontFamily: "'Inter', sans-serif",
};

const userBubbleStyle: React.CSSProperties = {
  backgroundColor: "#1A1A1A",
  color: "#FFFFFF",
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: "1.5",
  padding: "10px 16px",
  borderRadius: "18px 18px 4px 18px",
  maxWidth: "80%",
  wordBreak: "break-word",
};

const messageContentStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.7",
  wordBreak: "break-word",
  color: "#2D2D2D",
  fontFamily: "'Inter', sans-serif",
};

const suggestionsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "16px",
};

const chipStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "24px",
  backgroundColor: "#FFFFFF",
  border: "1px solid rgba(0, 0, 0, 0.10)",
  color: "#1A1A1A",
  fontSize: "11px",
  fontWeight: 500,
  fontFamily: "'Inter', sans-serif",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.25s ease",
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

// ─── Loading State ──────────────────────────────────────────────

const loadingContentStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  padding: "28px 22px",
};

const loadingTitleStyle: React.CSSProperties = {
  fontFamily: "'Roboto Serif', Georgia, serif",
  fontSize: "15px",
  fontWeight: 500,
  color: "#1A1A1A",
  marginBottom: "3px",
  lineHeight: 1.4,
};

const loadingSubtitleStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#AAAAAA",
  fontStyle: "italic",
  fontFamily: "'Inter', sans-serif",
};

const loadingContextStyle: React.CSSProperties = {
  marginTop: "28px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const loadingContextLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  color: "#AAAAAA",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontFamily: "'Inter', sans-serif",
};

const loadingContextTextStyle: React.CSSProperties = {
  fontFamily: "'Roboto Serif', Georgia, serif",
  fontSize: "15px",
  color: "#1A1A1A",
  lineHeight: 1.5,
};

// ─── Input Area ─────────────────────────────────────────────────

const inputFooterStyle: React.CSSProperties = {
  padding: "0",
  position: "relative",
  zIndex: 5,
};

const inputAreaStyle: React.CSSProperties = {
  padding: "12px 16px 4px 16px",
  display: "flex",
  gap: "0",
  alignItems: "center",
};

const inputWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  backgroundColor: "#111111",
  borderRadius: "28px",
  padding: "4px 4px 4px 18px",
  gap: "8px",
};

const inputFieldStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: "transparent",
  border: "none",
  padding: "10px 0",
  color: "#FFFFFF",
  fontSize: "13px",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 400,
  outline: "none",
  letterSpacing: "0.01em",
};

const sendButtonStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  border: "none",
  backgroundColor: "#333333",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  flexShrink: 0,
  cursor: "pointer",
};

const disclaimerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "10px",
  color: "#CCCCCC",
  fontFamily: "'Inter', sans-serif",
  padding: "6px 16px 12px 16px",
  letterSpacing: "0.01em",
};

// ─── CSS Animations & Styles ────────────────────────────────────────────────

const customAnimationsAndStyles = (accentColor: string) => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

  .chat-toggle-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  }
  .chat-toggle-btn {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .chat-window-fadein {
    animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* ─── Ambient Gradient Blobs ─── */
  .ambient-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.5;
    pointer-events: none;
    z-index: 1;
    animation: blobFloat 8s ease-in-out infinite;
  }

  .blob-1 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(190, 170, 220, 0.6) 0%, rgba(190, 170, 220, 0) 70%);
    top: 15%;
    left: 10%;
    animation-delay: 0s;
    animation-duration: 9s;
  }

  .blob-2 {
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgba(170, 195, 235, 0.5) 0%, rgba(170, 195, 235, 0) 70%);
    top: 20%;
    right: 5%;
    animation-delay: -3s;
    animation-duration: 11s;
  }

  .blob-3 {
    width: 160px;
    height: 160px;
    background: radial-gradient(circle, rgba(220, 190, 210, 0.45) 0%, rgba(220, 190, 210, 0) 70%);
    top: 35%;
    left: 25%;
    animation-delay: -5s;
    animation-duration: 10s;
  }

  @keyframes blobFloat {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    25% {
      transform: translate(8px, -12px) scale(1.05);
    }
    50% {
      transform: translate(-5px, 8px) scale(0.97);
    }
    75% {
      transform: translate(10px, 5px) scale(1.02);
    }
  }

  /* ─── Suggestion Pill Hover ─── */
  .quick-chip:hover {
    background-color: #F0F0F0 !important;
    border-color: #1A1A1A !important;
    color: #000000 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
    transform: translateY(-1px);
  }

  /* ─── Loading Bar Animation ─── */
  .loading-bar-container {
    width: 100%;
    height: 2px;
    background: rgba(0, 0, 0, 0.04);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 14px;
  }

  .loading-bar {
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #1A1A1A, transparent);
    border-radius: 2px;
    animation: loadingSlide 1.5s ease-in-out infinite;
  }

  @keyframes loadingSlide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(350%);
    }
  }

  /* ─── Window Entrance ─── */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ─── Custom Scrollbar ─── */
  .custom-scrollbar::-webkit-scrollbar {
    width: 3px;
    height: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.06);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.12);
  }

  /* ─── Input Placeholder ─── */
  form input::placeholder {
    color: rgba(255, 255, 255, 0.45);
    font-family: 'Inter', sans-serif;
    font-weight: 400;
  }
  form input:focus {
    outline: none !important;
  }
`;
