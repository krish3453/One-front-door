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

import { sendMessage } from "./services/api";

import "./App.css";

interface UIMessage extends ChatMessage {
  sources?: ChatSource[];
}

function App() {
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

  /*
   * IMPORTANT:
   *
   * Keep the conversation ID in the frontend.
   *
   * This allows:
   *
   * User:
   *   Where is the library?
   *
   * Then:
   *   What are its timings?
   *
   * to use the SAME conversation.
   */
  const [conversationId, setConversationId] =
    useState<string | undefined>(
      undefined
    );

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

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
       * VERY IMPORTANT:
       *
       * Reset conversation ID.
       *
       * Otherwise the next question would
       * continue the old conversation.
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
   * RENDER
   * --------------------------------------------------
   */

  return (
    <div className="app">

      {/* ------------------------------------------------
          HEADER
      ------------------------------------------------ */}

      <header className="header">

        <div className="header-inner">

          <div>

            <h1>
              One Front Door
            </h1>

            <p>
              University AI Assistant
            </p>

          </div>

          {messages.length > 0 && (
            <button
              className="clear-button"
              onClick={
                handleClearChat
              }
              disabled={
                loading
              }
            >
              Clear chat
            </button>
          )}

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