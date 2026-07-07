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
}

export default function FramerChatWidget(props: ChatWidgetProps) {
  const {
    apiUrl = "https://your-portfolio-api.vercel.app/api/chat",
    botName = "Tanya's Portfolio Guide",
    greeting = "Welcome. I am Tanya's virtual guide. You can ask me questions about her design experience, checkout case study, design system work, or collaboration style. How can I guide you today?",
    accentColor = "#7C3AED", // Premium violet
    botAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", // Default elegant avatar
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
        <div key={idx} style={{ margin: "6px 0", minHeight: line === "" ? "12px" : "auto" }}>
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
          <strong key={idx} style={{ fontWeight: 600, color: "#FFFFFF" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

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
            {/* Museum/Exhibition Guide Badge Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div style={avatarContainerStyle}>
                {botAvatar ? (
                  <img src={botAvatar} alt="Tanya" style={avatarStyle} />
                ) : (
                  <div style={{ ...avatarStyle, backgroundColor: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    T
                  </div>
                )}
                <span style={onlineIndicatorStyle} />
              </div>
              <div>
                <div style={botNameStyle}>{botName}</div>
                <div style={botStatusStyle}>Exhibition Assistant</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Question Counter Indicator */}
              <div style={counterIndicatorStyle} title="Remaining questions in this session">
                {Math.max(0, 13 - userQuestionsCount)} left
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={closeButtonStyle}
                aria-label="Close Chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                  ...messageWrapperStyle,
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role !== "user" && (
                  <img src={botAvatar} alt="Avatar" style={messageAvatarStyle} />
                )}
                <div
                  style={{
                    ...messageBubbleStyle,
                    backgroundColor: msg.role === "user" ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
                    border: msg.role === "user" ? `1px solid ${accentColor}` : "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    color: msg.role === "user" ? "#FFFFFF" : "#D1D5DB",
                  }}
                >
                  {renderMessageContent(msg.message)}
                </div>
              </div>
            ))}

            {/* Bouncing Dot Loader */}
            {isLoading && (
              <div style={messageWrapperStyle}>
                <img src={botAvatar} alt="Avatar" style={messageAvatarStyle} />
                <div style={loaderBubbleStyle}>
                  <span className="dot" />
                  <span className="dot" style={{ animationDelay: "0.2s" }} />
                  <span className="dot" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          {!isLimitReached && !isLoading && (
            <div style={chipsContainerStyle} className="custom-scrollbar">
              {quickQuestions.map((q, idx) => (
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
                backgroundColor: inputValue.trim() && !isLoading && !isLimitReached ? accentColor : "rgba(255,255,255,0.03)",
                cursor: inputValue.trim() && !isLoading && !isLimitReached ? "pointer" : "default",
                opacity: isLimitReached ? 0.3 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke={inputValue.trim() && !isLoading && !isLimitReached ? "#FFFFFF" : "#4B5563"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  botAvatar: {
    type: ControlType.String,
    title: "Avatar URL",
    defaultValue: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
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

// React Inline Styles
const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "24px",
  right: "24px",
  zIndex: 9999,
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "rgba(17, 17, 21, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#E5E7EB",
  padding: "10px 16px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: 500,
  marginBottom: "12px",
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)",
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
  backgroundColor: "#111115",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
  transform: "rotate(45deg)",
};

const toggleButtonStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  border: "none",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  outline: "none",
};

const chatWindowStyle: React.CSSProperties = {
  width: "380px",
  height: "550px",
  borderRadius: "18px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  backgroundColor: "rgba(13, 13, 16, 0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  maxWidth: "calc(100vw - 48px)",
  maxHeight: "calc(100vh - 100px)",
};

const headerStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(255, 255, 255, 0.01)",
};

const botProfileStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const avatarContainerStyle: React.CSSProperties = {
  position: "relative",
  width: "34px",
  height: "34px",
};

const avatarStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  filter: "grayscale(100%)", // Minimal/museum guide aesthetic
};

const onlineIndicatorStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "0",
  right: "0",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#8B5CF6", // Violet indicator
  border: "2px solid #0d0d10",
};

const botNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "13px",
  color: "#FFFFFF",
};

const botStatusStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#9CA3AF",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const counterIndicatorStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#6B7280",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "10px",
  padding: "2px 8px",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
};

const closeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const messagesAreaStyle: React.CSSProperties = {
  flex: 1,
  padding: "16px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const messageWrapperStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  maxWidth: "85%",
  alignSelf: "stretch",
};

const messageAvatarStyle: React.CSSProperties = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  objectFit: "cover",
  alignSelf: "flex-end",
  filter: "grayscale(100%)",
};

const messageBubbleStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "12px",
  lineHeight: "1.6",
  wordBreak: "break-word",
};

const loaderBubbleStyle: React.CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "16px 16px 16px 4px",
  padding: "10px 16px",
  display: "flex",
  gap: "4px",
  alignItems: "center",
};

const chipsContainerStyle: React.CSSProperties = {
  padding: "0 16px 12px 16px",
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  flexShrink: 0,
};

const chipStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: "14px",
  backgroundColor: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "#9CA3AF",
  fontSize: "11px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.2s ease",
};

const inputAreaStyle: React.CSSProperties = {
  padding: "12px 16px 16px 16px",
  display: "flex",
  gap: "8px",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(0, 0, 0, 0.2)",
};

const inputFieldStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "10px",
  padding: "10px 14px",
  color: "#FFFFFF",
  fontSize: "12px",
  outline: "none",
  transition: "border-color 0.2s ease",
};

const sendButtonStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
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
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  }
  .chat-toggle-btn {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .chat-window-fadein {
    animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .quick-chip:hover {
    background-color: rgba(255,255,255,0.06) !important;
    border-color: ${accentColor} !important;
    color: #FFFFFF !important;
  }
  
  /* Bouncing Dots Loader */
  .dot {
    width: 5px;
    height: 5px;
    background-color: #9CA3AF;
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
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Custom Scrollbar Styles */
  .custom-scrollbar::-webkit-scrollbar {
    width: 3px;
    height: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;
