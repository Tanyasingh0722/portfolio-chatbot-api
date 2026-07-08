import * as React from "react";
import { addPropertyControls, ControlType } from "framer";

// Define the interface for props configurable within the Framer UI sidebar
interface ChatWidgetProps {
  apiUrl: string;
  botName: string;
  greeting: string;
  accentColor: string;
  placeholderText: string;
  quickQuestions: string[];
}

export default function FramerChatWidget(props: ChatWidgetProps) {
  const {
    apiUrl = "https://your-portfolio-api.vercel.app/api/chat",
    botName = "Tanya's Portfolio Guide",
    greeting = "Welcome. I am Tanya's virtual guide. You can ask me questions about her design experience, checkout case study, design system work, or collaboration style. How can I guide you today?",
    accentColor = "#7C3AED",
    placeholderText = "Ask about Tanya's projects, experience...",
    quickQuestions = [
      "Give me Tanya's 30-second summary",
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
  const [usedQuestions, setUsedQuestions] = React.useState<Set<string>>(new Set());

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

  // Get 3 suggestion pills (excluding already-used questions)
  const getSuggestionPills = (): string[] => {
    const available = quickQuestions.filter(q => !usedQuestions.has(q));
    if (available.length <= 3) return available;
    // Pick 3 sequential starting from a rotating offset
    const offset = usedQuestions.size % (available.length - 2);
    return available.slice(offset, offset + 3);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isLimitReached) return;

    const userMsg = text.trim();
    const newMessages = [...messages, { role: "user" as const, message: userMsg }];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    // Track used questions
    setUsedQuestions(prev => new Set(prev).add(userMsg));

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMsg,
          history: newMessages.slice(0, -1), // Sends full conversation history
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to API");
      }

      const data = await response.json();
      if (data.response) {
        setMessages((prev) => [...prev, { role: "model", message: data.response }]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Chatbot API Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          message: "I am having trouble connecting to my API right now. Please verify that the server is active, or contact Tanya directly at singhtanya20003@gmail.com!"
        }
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
          <li style={{ marginLeft: "12px", marginBottom: "4px" }}>
            {parseInlineMarkdown(bulletText)}
          </li>
        );
      } else {
        content = parseInlineMarkdown(line);
      }

      return (
        <div key={idx} style={{ margin: "4px 0", minHeight: line === "" ? "8px" : "auto" }}>
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
          <strong key={idx} style={{ fontWeight: 600, color: "#1A1A1A" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const suggestionPills = getSuggestionPills();
  const lastMessageIsBot = messages.length > 0 && messages[messages.length - 1].role === "model";
  const showPills = !isLimitReached && !isLoading && lastMessageIsBot && suggestionPills.length > 0;

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
              backgroundColor: accentColor,
            }}
            aria-label="Open Chatbot Guide"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.9021 3.59005 15.6667 4.59852 17.1197L3.03362 20.2495C2.86877 20.5792 3.12356 20.9659 3.48624 20.9329L7.33235 20.5833C8.75677 20.8546 10.3333 21 12 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div ref={chatWindowRef} style={chatWindowStyle} className="chat-window-fadein">
          {/* Header */}
          <div style={headerStyle}>
            <div style={botProfileStyle}>
              <div>
                <div style={botNameStyle}>{botName}</div>
                <div style={botStatusStyle}>
                  <span style={onlineDotStyle} />
                  Online
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Question Counter Indicator */}
              <div style={counterIndicatorStyle} title="Remaining questions in this session">
                {Math.max(0, 13 - userQuestionsCount)} left
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={closeButtonStyle}
                aria-label="Close Chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div style={messagesAreaStyle} className="custom-scrollbar">
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {/* Sender label */}
                <div style={{
                  fontSize: "10px",
                  color: "#9CA3AF",
                  marginBottom: "4px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}>
                  {msg.role === "user" ? "You" : botName.split("'")[0] + "'s Guide"}
                </div>
                <div
                  style={{
                    ...messageBubbleStyle,
                    backgroundColor: msg.role === "user" ? accentColor : "#F5F5F7",
                    color: msg.role === "user" ? "#FFFFFF" : "#3A3A3C",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  }}
                >
                  {renderMessageContent(msg.message)}
                </div>
              </div>
            ))}

            {/* Bouncing Dot Loader */}
            {isLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{
                  fontSize: "10px",
                  color: "#9CA3AF",
                  marginBottom: "4px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}>
                  Typing...
                </div>
                <div style={loaderBubbleStyle}>
                  <span className="dot" />
                  <span className="dot" style={{ animationDelay: "0.2s" }} />
                  <span className="dot" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}

            {/* Suggestion Pills — inline after last bot message */}
            {showPills && (
              <div style={inlinePillsContainerStyle}>
                {suggestionPills.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(q)}
                    className="quick-chip"
                    style={pillStyle}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleFormSubmit} style={inputAreaStyle}>
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
                backgroundColor: inputValue.trim() && !isLoading && !isLimitReached ? accentColor : "#F0F0F2",
                cursor: inputValue.trim() && !isLoading && !isLimitReached ? "pointer" : "default",
                opacity: isLimitReached ? 0.3 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke={inputValue.trim() && !isLoading && !isLimitReached ? "#FFFFFF" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
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
    defaultValue: "https://your-portfolio-api.vercel.app/api/chat",
    description: "The Vercel endpoint hosting your api/chat.js endpoint.",
  },
  botName: {
    type: ControlType.String,
    title: "Bot Name",
    defaultValue: "Tanya's Portfolio Guide",
  },
  greeting: {
    type: ControlType.String,
    title: "Greeting",
    defaultValue: "Welcome. I am Tanya's virtual guide. You can ask me questions about her design experience, checkout case study, design system work, or collaboration style. How can I guide you today?",
  },
  accentColor: {
    type: ControlType.Color,
    title: "Accent Color",
    defaultValue: "#7C3AED",
  },
  placeholderText: {
    type: ControlType.String,
    title: "Placeholder",
    defaultValue: "Ask about Tanya's projects, experience...",
  },
  quickQuestions: {
    type: ControlType.Array,
    title: "Quick Prompts",
    control: {
      type: ControlType.String,
    },
    defaultValue: [
      "Give me Tanya's 30-second summary",
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

// ─── React Inline Styles ────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "24px",
  right: "24px",
  zIndex: 9999,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E8E8EC",
  color: "#3A3A3C",
  padding: "10px 16px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: 500,
  marginBottom: "12px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
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
  borderBottom: "1px solid #E8E8EC",
  borderRight: "1px solid #E8E8EC",
  transform: "rotate(45deg)",
};

const toggleButtonStyle: React.CSSProperties = {
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  border: "none",
  boxShadow: "0 4px 20px rgba(124, 58, 237, 0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  outline: "none",
};

const chatWindowStyle: React.CSSProperties = {
  width: "358px",
  maxWidth: "358px",
  height: "520px",
  borderRadius: "16px",
  border: "1px solid #E8E8EC",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 16px 48px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.04)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  maxHeight: "calc(100vh - 100px)",
};

const headerStyle: React.CSSProperties = {
  padding: "16px 18px",
  borderBottom: "1px solid #F0F0F2",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#FFFFFF",
};

const botProfileStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const onlineDotStyle: React.CSSProperties = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#34C759",
  marginRight: "5px",
};

const botNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "14px",
  color: "#1A1A1A",
  letterSpacing: "-0.01em",
};

const botStatusStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#9CA3AF",
  display: "flex",
  alignItems: "center",
  marginTop: "1px",
};

const counterIndicatorStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#9CA3AF",
  border: "1px solid #E8E8EC",
  borderRadius: "10px",
  padding: "2px 8px",
  backgroundColor: "#FAFAFA",
  fontWeight: 500,
};

const closeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "6px",
  transition: "background 0.15s ease",
};

const messagesAreaStyle: React.CSSProperties = {
  flex: 1,
  padding: "16px 18px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  backgroundColor: "#FFFFFF",
};

const messageBubbleStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "13px",
  lineHeight: "1.55",
  wordBreak: "break-word",
  maxWidth: "88%",
};

const loaderBubbleStyle: React.CSSProperties = {
  backgroundColor: "#F5F5F7",
  borderRadius: "16px 16px 16px 4px",
  padding: "10px 16px",
  display: "flex",
  gap: "5px",
  alignItems: "center",
};

const inlinePillsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  alignItems: "flex-start",
  paddingLeft: "2px",
  marginTop: "-4px",
};

const pillStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: "20px",
  backgroundColor: "#FAFAFA",
  border: "1px solid #E8E8EC",
  color: "#6B7280",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "normal",
  textAlign: "left",
  transition: "all 0.2s ease",
  lineHeight: "1.35",
  fontWeight: 450,
};

const inputAreaStyle: React.CSSProperties = {
  padding: "12px 18px 16px 18px",
  display: "flex",
  gap: "8px",
  borderTop: "1px solid #F0F0F2",
  backgroundColor: "#FAFAFA",
};

const inputFieldStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: "#FFFFFF",
  border: "1px solid #E8E8EC",
  borderRadius: "10px",
  padding: "10px 14px",
  color: "#1A1A1A",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.2s ease",
};

const sendButtonStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};

// CSS styles injected dynamically
const customAnimationsAndStyles = (accentColor: string) => `
  .chat-toggle-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 28px rgba(124, 58, 237, 0.3);
  }
  .chat-toggle-btn {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .chat-window-fadein {
    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .quick-chip:hover {
    background-color: #F0ECFB !important;
    border-color: ${accentColor} !important;
    color: ${accentColor} !important;
  }
  
  /* Bouncing Dots Loader */
  .dot {
    width: 5px;
    height: 5px;
    background-color: #C4C4CC;
    border-radius: 50%;
    display: inline-block;
    animation: bounce 1.4s infinite ease-in-out both;
  }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1.0); }
  }
  
  /* Slide in/fade in window */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Custom Scrollbar Styles — minimal */
  .custom-scrollbar::-webkit-scrollbar {
    width: 3px;
    height: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.08);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.14);
  }

  /* Input focus state */
  form input:focus {
    border-color: ${accentColor} !important;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08);
  }

  /* Close button hover */
  button[aria-label="Close Chat"]:hover {
    background-color: #F5F5F7 !important;
  }
`;
