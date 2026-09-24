import { useState } from "react";
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

  return (
    <div className="app">
      <header className="header">
        <h1>One Front Door</h1>
        <p>University AI Assistant</p>
      </header>

      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <h2>How can I help?</h2>

              <p>
                Ask about courses, exams, attendance,
                university rules, or general questions.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role}`}
            >
              <div className="message-content">
                {message.role === "assistant" ? (
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>

              {message.role === "assistant" && message.agent && (
  <div className="message-agent">
    {message.agent === "campus" && " Campus Assistant"}
    {message.agent === "academic" && " Academic Assistant"}
    {message.agent === "general" && " General Assistant"}
    {message.agent === "multi" && "Multiple Assistants"}
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
                          <span className="source-name">
                            {source.source}
                          </span>

                          {source.page !== undefined && (
                            <span className="source-page">
                              Page {source.page}
                            </span>
                          )}

                          <span className="source-type">
                            {source.documentType}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-content">
                Thinking...
              </div>
            </div>
          )}
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
          />

          <button
            type="submit"
            disabled={
              loading || input.trim().length === 0
            }
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;