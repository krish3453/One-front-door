import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import type {
  ChatMessage,
  ChatSource,
  AgentExecutionStep,
  ActionPayload,
} from "@one-front-door/shared-types";

import {
  streamChatMessage,
  getCurrentUser,
  logout,
  type AuthUser,
} from "./services/api";

import Login from "./Login";
import "./App.css";

interface UIMessage extends ChatMessage {
  sources?: ChatSource[];
  steps?: AgentExecutionStep[];
  actionData?: ActionPayload;
}

function App() {
  /*
   * --------------------------------------------------
   * AUTH STATE
   * --------------------------------------------------
   */
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [, setAuthError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  /*
   * --------------------------------------------------
   * CHAT STATE
   * --------------------------------------------------
   */
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingSteps, setStreamingSteps] = useState<AgentExecutionStep[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /*
   * --------------------------------------------------
   * AUTH CHECK ON INITIAL LOAD
   * --------------------------------------------------
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam) {
      setAuthError(errorParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const checkAuth = async () => {
      try {
        const authData = await getCurrentUser();
        if (authData.authenticated && authData.user) {
          setUser(authData.user);
        }
      } catch (err) {
        console.warn("[App] Auth status check:", err);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  /*
   * --------------------------------------------------
   * LOGOUT
   * --------------------------------------------------
   */
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } catch (err) {
      console.error("[App] Logout error:", err);
    } finally {
      setUser(null);
      setMessages([]);
      setConversationId(undefined);
      setInput("");
      setLoggingOut(false);
    }
  };

  /*
   * --------------------------------------------------
   * AUTO SCROLL
   * --------------------------------------------------
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading, streamingSteps]);

  /*
   * --------------------------------------------------
   * COPY TO CLIPBOARD HELPER
   * --------------------------------------------------
   */
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  };

  /*
   * --------------------------------------------------
   * SEND MESSAGE (SSE STREAMING)
   * --------------------------------------------------
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const messageText = input.trim();
    if (!messageText || loading) {
      return;
    }

    const assistantMsgId = crypto.randomUUID();

    // 1. Add User Message
    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    };

    // 2. Prepare initial empty Assistant Message for streaming
    const initialAssistantMessage: UIMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      steps: [],
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInput("");
    setLoading(true);
    setStreamingSteps([]);

    try {
      await streamChatMessage(
        {
          message: messageText,
          conversationId,
        },
        {
          onStep: (step) => {
            setStreamingSteps((prev) => {
              const existingIdx = prev.findIndex((s) => s.stage === step.stage);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = step;
                return next;
              }
              return [...prev, step];
            });

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      agent: step.agent ?? msg.agent,
                      steps: [
                        ...(msg.steps?.filter((s) => s.stage !== step.stage) ?? []),
                        step,
                      ],
                    }
                  : msg
              )
            );
          },

          onToken: (delta) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: msg.content + delta,
                    }
                  : msg
              )
            );
          },

          onAction: (actionData) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      actionData,
                    }
                  : msg
              )
            );
          },

          onSources: (sources) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      sources,
                    }
                  : msg
              )
            );
          },

          onDone: (response) => {
            if (response.conversationId) {
              setConversationId(response.conversationId);
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      ...response.message,
                      sources: response.sources ?? msg.sources ?? [],
                      steps: response.steps ?? msg.steps ?? [],
                    }
                  : msg
              )
            );
          },

          onError: (errMsg) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content:
                        msg.content ||
                        `Error: ${errMsg || "Failed to complete request."}`,
                    }
                  : msg
              )
            );
          },
        }
      );
    } catch (error) {
      console.error("[Frontend] Streaming error:", error);

      let errorText = "Sorry, I couldn't process your request. Please try again.";
      if (error instanceof Error && error.message) {
        errorText = error.message;
        if (
          error.message.includes("Authentication required") ||
          error.message.includes("401")
        ) {
          setUser(null);
          return;
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: msg.content || errorText,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
      setStreamingSteps([]);
    }
  };

  /*
   * --------------------------------------------------
   * CLEAR CHAT
   * --------------------------------------------------
   */
  const handleClearChat = () => {
    if (loading) return;
    setMessages([]);
    setConversationId(undefined);
    setInput("");
  };

  /*
   * --------------------------------------------------
   * SUGGESTIONS
   * --------------------------------------------------
   */
  const handleSuggestion = (suggestion: string) => {
    if (loading) return;
    setInput(suggestion);
  };

  /*
   * --------------------------------------------------
   * RENDER: AUTH LOADING
   * --------------------------------------------------
   */
  if (authChecking) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <div className="auth-loading-logo">
            <svg
              className="login-logo-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className="loading-spinner" />
          <p>Connecting to One Front Door...</p>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * RENDER: LOGIN IF NOT AUTHENTICATED
   * --------------------------------------------------
   */
  if (!user) {
    return (
      <Login
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
        }}
      />
    );
  }

  /*
   * --------------------------------------------------
   * RENDER: MAIN CHAT APP
   * --------------------------------------------------
   */
  return (
    <div className="app">
      {/* ------------------------------------------------
          HEADER
      ------------------------------------------------ */}
      <header className="header">
        <div className="header-content">
          <div className="logo-group">
            <div className="logo-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <div className="logo-title-row">
                <h1>One Front Door</h1>
                <span className="badge-agentic">⚡ Multi-Agent Copilot</span>
              </div>
              <p>Autonomous AI University Assistant & Action Engine</p>
            </div>
          </div>

          <div className="header-actions">
            {messages.length > 0 && (
              <button
                id="clear-chat-btn"
                className="clear-button"
                onClick={handleClearChat}
                disabled={loading}
              >
                Clear chat
              </button>
            )}

            <div className="user-profile-badge">
              {user.image || user.picture ? (
                <img
                  src={user.image || user.picture}
                  alt={user.name || "Student"}
                  className="user-profile-avatar"
                />
              ) : (
                <div className="user-profile-initial">
                  {(user.name || user.email || "S").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="user-profile-info">
                <span className="user-profile-name">
                  {user.name || "Campus Student"}
                </span>
                <span className="user-profile-email">
                  {user.email || "Active Session"}
                </span>
              </div>
            </div>

            <button
              id="logout-btn"
              className="logout-button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign out"
            >
              <svg
                className="logout-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------
          CHAT CONTAINER
      ------------------------------------------------ */}
      <main className="chat-container">
        <div className="messages">
          {/* ------------------------------------------------
              WELCOME SCREEN WITH ACTION HERO TILES
          ------------------------------------------------ */}
          {messages.length === 0 && (
            <div className="welcome">
              <div className="welcome-hero-badge">
                <span>🎓 Powered by LangGraph + Qdrant RAG + Redis Multi-Tier</span>
              </div>

              <h2>Welcome to One Front Door</h2>
              <p>
                Your intelligent university copilot. Query official course syllabi,
                calculate safe attendance bunks, draft administrative petitions, and verify campus regulations in real-time.
              </p>

              {/* ACTION FEATURE CARDS */}
              <div className="feature-grid">
                <div
                  className="feature-card"
                  onClick={() =>
                    handleSuggestion(
                      "I have 18 out of 24 classes attended in Operating Systems. Can I bunk tomorrow's lecture?"
                    )
                  }
                >
                  <div className="feature-icon">📊</div>
                  <div className="feature-info">
                    <h4>Bunk & Attendance Planner</h4>
                    <p>Calculate safe skips remaining & recovery trajectory to stay above 75%</p>
                  </div>
                </div>

                <div
                  className="feature-card"
                  onClick={() =>
                    handleSuggestion(
                      "Draft a formal petition to the Dean for a Makeup Mid-Term Exam in Data Structures due to severe viral fever."
                    )
                  }
                >
                  <div className="feature-icon">📝</div>
                  <div className="feature-info">
                    <h4>Academic Petition Drafter</h4>
                    <p>Generate pre-formatted letters & appeals with cited BU regulations</p>
                  </div>
                </div>

                <div
                  className="feature-card"
                  onClick={() =>
                    handleSuggestion(
                      "What is the complete course curriculum, credits, and syllabus for B.Tech CSE 4th semester?"
                    )
                  }
                >
                  <div className="feature-icon">📚</div>
                  <div className="feature-info">
                    <h4>Syllabus & Curriculum Graph</h4>
                    <p>Verified subject modules, evaluation schemes, and course prerequisites</p>
                  </div>
                </div>

                <div
                  className="feature-card"
                  onClick={() =>
                    handleSuggestion(
                      "What are the official penalties for hostel night curfew violation and breathalyzer policy?"
                    )
                  }
                >
                  <div className="feature-icon">⚖️</div>
                  <div className="feature-info">
                    <h4>Campus Discipline & Code</h4>
                    <p>Official student handbook, hostel rules, fines, and disciplinary clauses</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------
              CHAT MESSAGES LIST
          ------------------------------------------------ */}
          {messages.map((message) => {
            const isTraceExpanded = expandedTraceId === message.id;
            const messageSteps = message.steps || [];

            return (
              <div
                key={message.id}
                className={`message-row ${message.role}`}
              >
                <div
                  className={`message ${
                    message.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >
                  {/* ASSISTANT AGENT HEADER & TRACE INSPECTOR */}
                  {message.role === "assistant" && (
                    <div className="assistant-meta-bar">
                      <div className="agent-identity">
                        <span className="agent-avatar">🤖</span>
                        <span className="agent-name">
                          {message.agent === "academic" && "Academic Agent"}
                          {message.agent === "campus" && "Campus Agent"}
                          {message.agent === "general" && "General Agent"}
                          {message.agent === "multi" && "Multi-Agent Orchestrator"}
                          {!message.agent && "One Front Door"}
                        </span>
                      </div>

                      {/* EXECUTION TRACE TOGGLE BUTTON */}
                      {messageSteps.length > 0 && (
                        <button
                          type="button"
                          className={`trace-toggle-btn ${
                            isTraceExpanded ? "active" : ""
                          }`}
                          onClick={() =>
                            setExpandedTraceId(
                              isTraceExpanded ? null : message.id
                            )
                          }
                        >
                          <span>⚡ Execution Trace ({messageSteps.length} steps)</span>
                          <svg
                            className={`chevron ${isTraceExpanded ? "rotated" : ""}`}
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* EXPANDABLE AGENT REASONING TIMELINE */}
                  {message.role === "assistant" &&
                    isTraceExpanded &&
                    messageSteps.length > 0 && (
                      <div className="execution-trace-panel">
                        <div className="trace-header">
                          <span>🧠 LangGraph Execution Pipeline</span>
                          <span className="trace-model-pill">Multi-Agent StateGraph</span>
                        </div>
                        <div className="trace-timeline">
                          {messageSteps.map((step, idx) => (
                            <div key={step.id || idx} className="trace-step">
                              <div className="trace-step-marker">
                                <span className={`status-dot ${step.status}`} />
                                {idx < messageSteps.length - 1 && (
                                  <div className="trace-line" />
                                )}
                              </div>
                              <div className="trace-step-body">
                                <div className="trace-step-title-row">
                                  <strong>{step.title}</strong>
                                  {step.durationMs !== undefined && (
                                    <span className="trace-time">
                                      {step.durationMs}ms
                                    </span>
                                  )}
                                  {step.status === "cached" && (
                                    <span className="trace-badge-cached">⚡ Redis HIT</span>
                                  )}
                                </div>
                                <p className="trace-step-desc">{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* ACTION CARD: ATTENDANCE CALCULATOR WIDGET */}
                  {message.role === "assistant" &&
                    message.actionData?.type === "attendance_calculator" &&
                    message.actionData.attendance && (
                      <div className="action-widget attendance-widget">
                        <div className="widget-header">
                          <span className="widget-icon">📊</span>
                          <div>
                            <h4>Attendance & Bunk Forecaster</h4>
                            <p>{message.actionData.attendance.subjectName || "Semester Course"}</p>
                          </div>
                          <span
                            className={`status-pill ${message.actionData.attendance.status}`}
                          >
                            {message.actionData.attendance.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="meter-container">
                          <div className="meter-labels">
                            <span>Current: <strong>{message.actionData.attendance.currentPercentage}%</strong></span>
                            <span>Target: {message.actionData.attendance.targetPercentage}% min</span>
                          </div>
                          <div className="meter-bar-bg">
                            <div
                              className={`meter-bar-fill ${
                                message.actionData.attendance.currentPercentage >= 75
                                  ? "fill-safe"
                                  : "fill-danger"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(5, message.actionData.attendance.currentPercentage)
                                )}%`,
                              }}
                            />
                            <div
                              className="meter-threshold-marker"
                              style={{ left: `${message.actionData.attendance.targetPercentage}%` }}
                              title="75% Debarment Line"
                            />
                          </div>
                        </div>

                        <div className="attendance-stats-grid">
                          <div className="stat-box">
                            <span className="stat-label">Classes Attended</span>
                            <span className="stat-value">
                              {message.actionData.attendance.attended} /{" "}
                              {message.actionData.attendance.conducted}
                            </span>
                          </div>

                          <div className="stat-box">
                            <span className="stat-label">Safe Bunks Left</span>
                            <span className="stat-value safe-highlight">
                              {message.actionData.attendance.bunksAvailable}
                            </span>
                          </div>

                          <div className="stat-box">
                            <span className="stat-label">Recovery Needed</span>
                            <span className="stat-value warn-highlight">
                              {message.actionData.attendance.classesNeededToRecover > 0
                                ? `${message.actionData.attendance.classesNeededToRecover} classes`
                                : "0 (On Track)"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* ACTION CARD: ACADEMIC PETITION DRAFTER WIDGET */}
                  {message.role === "assistant" &&
                    message.actionData?.type === "academic_petition" &&
                    message.actionData.petition && (
                      <div className="action-widget petition-widget">
                        <div className="widget-header">
                          <span className="widget-icon">📝</span>
                          <div>
                            <h4>Official Academic Petition Prepared</h4>
                            <p>{message.actionData.petition.subject}</p>
                          </div>
                          <div className="petition-actions">
                            <button
                              type="button"
                              className="btn-copy-action"
                              onClick={() =>
                                handleCopyText(
                                  message.actionData?.petition?.body || "",
                                  message.id
                                )
                              }
                            >
                              {copiedId === message.id ? "✓ Copied" : "📋 Copy Letter"}
                            </button>
                            <a
                              className="btn-mail-action"
                              href={`mailto:dean.academics@bennett.edu.in?subject=${encodeURIComponent(
                                message.actionData.petition.subject
                              )}&body=${encodeURIComponent(
                                message.actionData.petition.body
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              ✉️ Email Dean
                            </a>
                          </div>
                        </div>

                        <div className="petition-cited-rules">
                          <span className="rules-heading">Cited Regulations:</span>
                          <ul>
                            {message.actionData.petition.relevantRulesCited.map(
                              (rule, i) => (
                                <li key={i}>{rule}</li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                  {/* MESSAGE CONTENT */}
                  {message.role === "assistant" ? (
                    <div className="markdown-content">
                      {message.content ? (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      ) : (
                        <div className="stream-cursor-line">
                          <span className="stream-pulsing-dot" /> Thinking & retrieving knowledge...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="user-content">{message.content}</div>
                  )}

                  {/* SOURCES LIST */}
                  {message.role === "assistant" &&
                    message.sources &&
                    message.sources.length > 0 && (
                      <div className="sources">
                        <div className="sources-title">
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          <span>Verified University Sources ({message.sources.length})</span>
                        </div>

                        <div className="sources-grid">
                          {message.sources.map((source, index) => (
                            <div
                              key={`${source.source}-${source.page}-${index}`}
                              className="source-chip"
                            >
                              <span className="source-doc-name">
                                {source.source.replace(".pdf", "")}
                              </span>
                              {source.page !== undefined && (
                                <span className="source-page-badge">
                                  Page {source.page}
                                </span>
                              )}
                              <span className="source-tag">
                                {source.documentType.replace("_", " ")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          })}

          {/* STREAMING LIVE AGENT EXECUTION STATUS INDICATOR */}
          {loading && streamingSteps.length > 0 && (
            <div className="live-stream-status-bar">
              <div className="pulse-spinner" />
              <div className="live-step-info">
                <strong>{streamingSteps[streamingSteps.length - 1]?.title}</strong>
                <span>{streamingSteps[streamingSteps.length - 1]?.description}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ------------------------------------------------
            PROMPT INPUT BAR
        ------------------------------------------------ */}
        <form className="input-container" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about courses, bunk calculations, petition drafting, or campus policies..."
            disabled={loading}
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            className="send-button"
          >
            {loading ? (
              <span className="btn-loading-dots">
                <span />
                <span />
                <span />
              </span>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;