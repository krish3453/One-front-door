import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
import GhostFibers from "./components/GhostFibers/GhostFibers";
import InteractiveOrb from "./components/InteractiveOrb/InteractiveOrb";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      {/* GhostFibers animated WebGL background */}
      <div className="app-fibers-bg">
        <GhostFibers
          lineColor="#0c0e14"
          glowColor="#fde047"
          speed={0.15}
          scale={2.2}
          rotation={10}
          rotationSpeed={0.18}
          layers={3}
          waveAmplitude={0.014}
          waveFrequency={2.5}
          waveSpeed={0.12}
          layerSpeed={0.06}
          twist={0.08}
          twistFrequency={4}
          twistSpeed={0.9}
          lineFrequency={4}
          lineSpacing={2}
          lineSharpness={14}
          glowFalloff={12}
          glowIntensity={0.8}
          brightness={1.1}
          blueBoost={0.3}
          vignette={0.8}
          grain={0.03}
          dpr={1}
        />
      </div>

      {/* ------------------------------------------------
          LEFTBAR / SIDEBAR
      ------------------------------------------------ */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <img
                src="/ofd-logo-white.png"
                alt="One Front Door"
                className="sidebar-logo-img"
              />
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">One Front Door</span>
              <span className="sidebar-brand-tag">PRO Copilot</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="m14 9-3 3 3 3" />
            </svg>
          </button>
        </div>

        {/* PRIMARY ACTION: NEW CHAT */}
        <button
          type="button"
          className="sidebar-new-chat-btn"
          onClick={handleClearChat}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Chat</span>
        </button>

        {/* CHAT SESSIONS / CONVERSATION HISTORY */}
        <div className="sidebar-nav-section sidebar-history-section">
          <span className="sidebar-section-label">CHATS</span>
          <div className="sidebar-history-list">
            {messages.length > 0 ? (
              <button
                type="button"
                className="sidebar-history-item active"
                onClick={() => { }}
                title={messages[0]?.content || "Current Conversation"}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="truncate">
                  {messages.find((m) => m.role === "user")?.content || "Current Session"}
                </span>
              </button>
            ) : (
              <div className="sidebar-empty-history">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>No active chat history</span>
              </div>
            )}
          </div>
        </div>

        {/* PRO COPILOT BOTTOM CARD */}
        {/* USER PROFILE & LOGOUT AT BOTTOM OF SIDEBAR */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {user.image || user.picture ? (
                <img
                  src={user.image || user.picture}
                  alt={user.name || "Student"}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerText = (
                        user.name || user.email || "S"
                      )
                        .charAt(0)
                        .toUpperCase();
                    }
                  }}
                />
              ) : (
                <span>
                  {(user.name || user.email || "S").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name || "Student"}</span>
              <span className="sidebar-user-email">{user.email || "student@bennett.edu.in"}</span>
            </div>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign out"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              className="sidebar-clear-btn"
              onClick={handleClearChat}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Clear Current Chat</span>
            </button>
          )}
        </div>
      </aside>

      {/* ------------------------------------------------
          MAIN CONTENT AREA (CHAT + FLOATING SIDEBAR TOGGLE)
      ------------------------------------------------ */}
      <div className="app-main">
        {/* FLOATING TOP BAR (VISIBLE WHEN SIDEBAR COLLAPSED) */}
        {!sidebarOpen && (
          <div className="floating-top-bar">
            <button
              type="button"
              className="sidebar-expand-trigger-btn"
              onClick={() => setSidebarOpen(true)}
              title="Expand sidebar"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span>One Front Door</span>
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                className="floating-clear-btn"
                onClick={handleClearChat}
                disabled={loading}
              >
                Clear chat
              </button>
            )}
          </div>
        )}

        {/* ------------------------------------------------
            CHAT CONTAINER
        ------------------------------------------------ */}
        <main className="chat-container">
          <div className="messages">
            {/* ------------------------------------------------
                WELCOME SCREEN — INTERACTIVE LIQUID ORB + CHIPS + CARDS
            ------------------------------------------------ */}
            {messages.length === 0 && (
              <div className="welcome">
                {/* CURSOR-INTERACTIVE 3D LIVING LIQUID ORB */}
                <InteractiveOrb />

                <h2>What would you like to know about Bennett?</h2>
                <p className="welcome-subtitle">
                  Your university copilot — ask about attendance policies, bunk allowances, courses & electives, campus rules, mess timings, or draft official dean petitions.
                </p>

                {/* QUICK ACTION CHIPS */}
                <div className="welcome-chips">
                  <button
                    type="button"
                    className="welcome-chip"
                    onClick={() =>
                      handleSuggestion(
                        "I have 18 out of 24 classes attended in Operating Systems. Can I bunk tomorrow's lecture?"
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                    Bunk Calculator
                  </button>
                  <button
                    type="button"
                    className="welcome-chip"
                    onClick={() =>
                      handleSuggestion(
                        "Draft a formal petition to the Dean for a Makeup Mid-Term Exam in Data Structures due to severe viral fever."
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                    Draft Petition
                  </button>
                  <button
                    type="button"
                    className="welcome-chip"
                    onClick={() =>
                      handleSuggestion(
                        "What is the complete course curriculum, credits, and syllabus for B.Tech CSE 4th semester?"
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                    Explore Syllabus
                  </button>
                </div>

                {/* BOTTOM FEATURE CARDS */}
                <div className="feature-grid">
                  <div
                    className="feature-card"
                    onClick={() =>
                      handleSuggestion(
                        "I have 18 out of 24 classes attended in Operating Systems. Can I bunk tomorrow's lecture?"
                      )
                    }
                  >
                    <div className="feature-card-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                    </div>
                    <div className="feature-card-body">
                      <h4>Attendance Forecaster</h4>
                      <p>Calculate safe skips and recovery trajectory to stay above 75%</p>
                    </div>
                    <span className="feature-card-badge">Smart Planner</span>
                  </div>

                  <div
                    className="feature-card"
                    onClick={() =>
                      handleSuggestion(
                        "Draft a formal petition to the Dean for a Makeup Mid-Term Exam in Data Structures due to severe viral fever."
                      )
                    }
                  >
                    <div className="feature-card-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                    </div>
                    <div className="feature-card-body">
                      <h4>Petition Generator</h4>
                      <p>Auto-draft formal letters with cited university regulations</p>
                    </div>
                    <span className="feature-card-badge">Draft Letter</span>
                  </div>

                  <div
                    className="feature-card"
                    onClick={() =>
                      handleSuggestion(
                        "What are the official penalties for hostel night curfew violation and breathalyzer policy?"
                      )
                    }
                  >
                    <div className="feature-card-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    </div>
                    <div className="feature-card-body">
                      <h4>Campus Regulations</h4>
                      <p>Official policies, hostel rules, fines, and disciplinary codes</p>
                    </div>
                    <span className="feature-card-badge">Policy Lookup</span>
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
                    className={`message ${message.role === "user"
                        ? "user-message"
                        : "assistant-message"
                      }`}
                  >
                    {/* ASSISTANT AGENT HEADER & TRACE INSPECTOR */}
                    {message.role === "assistant" && (
                      <div className="assistant-meta-bar">
                        <div className="agent-identity">
                          <span className="agent-avatar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg></span>
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
                            className={`trace-toggle-btn ${isTraceExpanded ? "active" : ""
                              }`}
                            onClick={() =>
                              setExpandedTraceId(
                                isTraceExpanded ? null : message.id
                              )
                            }
                          >
                            <span>Execution Trace ({messageSteps.length} steps)</span>
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
                            <span>LangGraph Execution Pipeline</span>
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
                                      <span className="trace-badge-cached">Redis HIT</span>
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
                            <span className="widget-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg></span>
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
                                className={`meter-bar-fill ${message.actionData.attendance.currentPercentage >= 75
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

                    {/* ACTION CARD: ACADEMIC & CAMPUS PETITION DRAFTER WIDGET */}
                    {message.role === "assistant" &&
                      (message.actionData?.type === "academic_petition" || message.actionData?.type === "campus_petition") &&
                      message.actionData.petition && (
                        <div className="action-widget petition-widget">
                          <div className="widget-header">
                            <span className="widget-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></span>
                            <div>
                              <h4>{message.actionData.title || "Official Petition Prepared"}</h4>
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
                                {copiedId === message.id ? "Copied" : "Copy Letter"}
                              </button>
                              <a
                                className="btn-mail-action"
                                href={
                                  message.actionData.type === "campus_petition"
                                    ? `mailto:chiefwarden@bennett.edu.in?subject=${encodeURIComponent(message.actionData.petition.subject)}&body=${encodeURIComponent(message.actionData.petition.body)}`
                                    : `mailto:dean.academics@bennett.edu.in?subject=${encodeURIComponent(message.actionData.petition.subject)}&body=${encodeURIComponent(message.actionData.petition.body)}`
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                {message.actionData.type === "campus_petition" ? "Email Warden" : "Email Dean"}
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
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
    </div>
  );
}

export default App;