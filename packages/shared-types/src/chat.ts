export type MessageRole = "user" | "assistant" | "system";

export type AgentType =
  | "academic"
  | "campus"
  | "general";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  agent?: AgentType;
  createdAt: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
}