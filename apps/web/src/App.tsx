import {
  useEffect,
  useRef,
  useState,
} from "react";

import ReactMarkdown from "react-markdown";

import type {
  ChatMessage,
  ChatResponse,
  ChatSource,
} from "@one-front-door/shared-types";

import {
  sendMessage,
  getCurrentUser,
  logout,
  type AuthUser,
} from "./services/api";

import Login from "./Login";
import "./App.css";

interface UIMessage extends ChatMessage {
  sources?: ChatSource[];
}

function App() {
  /*
   * --------------------------------------------------
   * AUTH STATE
   * --------------------------------------------------
   */
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  /*
   * --------------------------------------------------
   * STATE
   * --------------------------------------------------
   */

  const [messages, setMessages] =
    useState<UIMessage[]>([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [conversationId, setConversationId] =
    useState<string | undefined>(
      undefined
    );

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

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
  }, [messages, loading]);

  /*
   * --------------------------------------------------
   * SEND MESSAGE
   * --------------------------------------------------
   */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const message =
      input.trim();

    if (
      !message ||
      loading
    ) {
      return;
    }

    /*
     * Add user message immediately.
     */
    const userMessage: UIMessage = {
      id:
        crypto.randomUUID(),

      role:
        "user",

      content:
        message,

      createdAt:
        new Date().toISOString(),
    };

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );

    setInput("");
    setLoading(true);

    try {
      /*
       * IMPORTANT:
       *
       * Send the existing conversationId
       * when this is a follow-up question.
       */
      const response: ChatResponse =
        await sendMessage({
          message,

          conversationId,
        });

      /*
       * --------------------------------------------------
       * SAVE CONVERSATION ID
       * --------------------------------------------------
       *
       * First request:
       *
       * conversationId = undefined
       *
       * Backend creates conversation and
       * returns an ID.
       *
       * Next request:
       *
       * conversationId = returned ID
       *
       * Backend loads previous messages.
       */

      if (
        response.conversationId
      ) {
        setConversationId(
          response.conversationId
        );
      }

      /*
       * Build assistant message.
       */
      const assistantMessage: UIMessage = {
        ...response.message,

        sources:
          response.sources ?? [],
      };

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

    } catch (error) {

      console.error(
        "[Frontend] Failed to send message:",
        error
      );

      /*
       * Show the actual error when possible.
       */
      let errorText =
        "Sorry, I couldn't process your request. Please try again.";

      if (
        error instanceof Error &&
        error.message
      ) {
        errorText =
          error.message;

        if (
          error.message.includes("Authentication required") ||
          error.message.includes("401")
        ) {
          setUser(null);
          return;
        }
      }

      const errorMessage: UIMessage = {
        id:
          crypto.randomUUID(),

        role:
          "assistant",

        content:
          errorText,

        createdAt:
          new Date().toISOString(),
      };

      setMessages(
        (previous) => [
          ...previous,
          errorMessage,
        ]
      );

    } finally {
      setLoading(false);
    }
  };

  /*
   * --------------------------------------------------
   * CLEAR CHAT
   * --------------------------------------------------
   */

  const handleClearChat =
    () => {

      if (loading) {
        return;
      }

      /*
       * Clear frontend messages.
       */
      setMessages([]);

      /*
       * Reset conversation ID.
       */
      setConversationId(
        undefined
      );

      setInput("");
    };

  /*
   * --------------------------------------------------
   * SUGGESTIONS
   * --------------------------------------------------
   */

  const handleSuggestion =
    (
      suggestion: string
    ) => {

      if (loading) {
        return;
      }

      setInput(
        suggestion
      );
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
          <div className="auth-loading-spinner" />
          <p className="auth-loading-text">Verifying campus session...</p>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * RENDER: LOGIN PAGE
   * --------------------------------------------------
   */
  if (!user) {
    return (
      <Login
        onLoginSuccess={(authedUser) => {
          setUser(authedUser);
          setAuthError(null);
        }}
        authError={authError}
        onClearError={() => setAuthError(null)}
      />
    );
  }

  /*
   * --------------------------------------------------
   * RENDER: AUTHENTICATED CHAT MENU
   * --------------------------------------------------
   */
  return (
    <div className="app">

      {/* ------------------------------------------------
          HEADER
      ------------------------------------------------ */}

      <header className="header">

        <div className="header-inner">

          <div className="header-brand">
            <div className="header-logo-badge">
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
              <h1>One Front Door</h1>
              <p>University AI Assistant</p>
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
              title="Sign out of One Front Door"
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
          CHAT
      ------------------------------------------------ */}

      <main className="chat-container">

        <div className="messages">

          {/* ------------------------------------------------
              WELCOME SCREEN
          ------------------------------------------------ */}

          {messages.length === 0 && (

            <div className="welcome">

              <div className="welcome-icon">
                OFD
              </div>

              <h2>
                How can I help?
              </h2>

              <p>
                Ask about academics,
                campus services,
                university information,
                or general questions.
              </p>

              <div className="suggestions">

                <button
                  onClick={() =>
                    handleSuggestion(
                      "Where is the library?"
                    )
                  }
                >
                  Where is the library?
                </button>

                <button
                  onClick={() =>
                    handleSuggestion(
                      "What is recursion?"
                    )
                  }
                >
                  What is recursion?
                </button>

                <button
                  onClick={() =>
                    handleSuggestion(
                      "Tell me about university services"
                    )
                  }
                >
                  University services
                </button>

              </div>

            </div>
          )}

          {/* ------------------------------------------------
              MESSAGES
          ------------------------------------------------ */}

          {messages.map(
            (message) => (

              <div
                key={
                  message.id
                }
                className={
                  `message-row ${message.role}`
                }
              >

                <div
                  className={
                    `message ${
                      message.role ===
                      "user"
                        ? "user-message"
                        : "assistant-message"
                    }`
                  }
                >

                  {/* ------------------------------------------
                      ASSISTANT MESSAGE
                  ------------------------------------------ */}

                  {message.role ===
                  "assistant" ? (

                    <div className="markdown-content">

                      <ReactMarkdown>
                        {
                          message.content
                        }
                      </ReactMarkdown>

                    </div>

                  ) : (

                    /* ------------------------------------------
                       USER MESSAGE
                    ------------------------------------------ */

                    <div className="user-content">
                      {
                        message.content
                      }
                    </div>

                  )}

                  {/* ------------------------------------------
                      AGENT BADGE
                  ------------------------------------------ */}

                  {message.role ===
                    "assistant" &&
                    message.agent && (

                      <div className="agent-badge">

                        {message.agent ===
                          "academic" &&
                          "Academic"}

                        {message.agent ===
                          "campus" &&
                          "Campus"}

                        {message.agent ===
                          "general" &&
                          "General"}

                        {message.agent ===
                          "multi" &&
                          "Multiple topics"}

                      </div>

                  )}

                  {/* ------------------------------------------
                      SOURCES
                  ------------------------------------------ */}

                  {message.role ===
                    "assistant" &&
                    message.sources &&
                    message.sources.length >
                      0 && (

                      <div className="sources">

                        <div className="sources-title">
                          Sources
                        </div>

                        {message.sources.map(
                          (
                            source,
                            index
                          ) => (

                            <div
                              key={
                                `${source.source}-${source.page}-${index}`
                              }
                              className="source"
                            >

                              <div className="source-main">

                                <span className="source-name">
                                  {
                                    source.source
                                  }
                                </span>

                                {source.page !==
                                  undefined && (

                                  <span>
                                    Page{" "}
                                    {
                                      source.page
                                    }
                                  </span>

                                )}

                              </div>

                              <span className="source-type">
                                {
                                  source.documentType
                                }
                              </span>

                            </div>

                          )
                        )}

                      </div>

                  )}

                </div>

              </div>

            )
          )}

          {/* ------------------------------------------------
              LOADING
          ------------------------------------------------ */}

          {loading && (

            <div className="message-row assistant">

              <div className="message assistant-message loading-message">

                <div className="loading-content">

                  <span />
                  <span />
                  <span />

                </div>

              </div>

            </div>

          )}

          <div
            ref={
              messagesEndRef
            }
          />

        </div>

        {/* ------------------------------------------------
            INPUT
        ------------------------------------------------ */}

        <form
          className="input-container"
          onSubmit={
            handleSubmit
          }
        >

          <input
            type="text"
            value={
              input
            }
            onChange={
              (event) =>
                setInput(
                  event.target.value
                )
            }
            placeholder="Ask something..."
            disabled={
              loading
            }
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={
              loading ||
              input.trim()
                .length === 0
            }
          >
            {loading
              ? "..."
              : "Send"}
          </button>

        </form>

      </main>

    </div>
  );
}

export default App;