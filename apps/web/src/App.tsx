import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import type {
  ChatMessage,
  ChatSource,
} from "@one-front-door/shared-types";

import { sendMessage } from "./services/api";

import "./App.css";

interface UIMessage extends ChatMessage {
  sources?: ChatSource[];
}

function App() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await sendMessage({
        message,
      });

      const assistantMessage: UIMessage = {
        ...response.message,
        sources: response.sources,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("Failed to send message:", error);

      const errorMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Sorry, I couldn't process your request. Please try again.",
        createdAt: new Date().toISOString(),
      };

      setMessages((previous) => [
        ...previous,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (loading) {
      return;
    }

    setMessages([]);
    setInput("");
  };

  const handleSuggestion = (suggestion: string) => {
    if (loading) {
      return;
    }

    setInput(suggestion);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>One Front Door</h1>
            <p>University AI Assistant</p>
          </div>

          {messages.length > 0 && (
            <button
              className="clear-button"
              onClick={handleClearChat}
              disabled={loading}
            >
              Clear chat
            </button>
          )}
        </div>
      </header>

      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">
              <div className="welcome-icon">
                OFD
              </div>

              <h2>How can I help?</h2>

              <p>
                Ask about academics, campus services,
                university information, or general questions.
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

          {messages.map((message) => (
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
                {message.role === "assistant" ? (
                  <div className="markdown-content">
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="user-content">
                    {message.content}
                  </div>
                )}

                {message.role === "assistant" &&
                  message.agent && (
                    <div className="agent-badge">
                      {message.agent === "academic" &&
                        "Academic"}

                      {message.agent === "campus" &&
                        "Campus"}

                      {message.agent === "general" &&
                        "General"}

                      {message.agent === "multi" &&
                        "Multiple topics"}
                    </div>
                  )}

                {message.role === "assistant" &&
                  message.sources &&
                  message.sources.length > 0 && (
                    <div className="sources">
                      <div className="sources-title">
                        Sources
                      </div>

                      {message.sources.map(
                        (source, index) => (
                          <div
                            key={`${source.source}-${source.page}-${index}`}
                            className="source"
                          >
                            <div className="source-main">
                              <span className="source-name">
                                {source.source}
                              </span>

                              {source.page !==
                                undefined && (
                                <span>
                                  Page {source.page}
                                </span>
                              )}
                            </div>

                            <span className="source-type">
                              {source.documentType}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>
          ))}

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

          <div ref={messagesEndRef} />
        </div>

        <form
          className="input-container"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            placeholder="Ask something..."
            disabled={loading}
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={
              loading || input.trim().length === 0
            }
          >
            {loading ? "..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;