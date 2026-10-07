import axios from "axios";

import type {
  ChatRequest,
  ChatResponse,
  StreamEvent,
} from "@one-front-door/shared-types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000,
  withCredentials: true,
});

/*
 * --------------------------------------------------
 * AUTH TYPES
 * --------------------------------------------------
 */

export interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  image?: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

/*
 * --------------------------------------------------
 * CHECK AUTHENTICATION
 * --------------------------------------------------
 */

export const getCurrentUser = async (): Promise<AuthResponse> => {
  try {
    const response = await api.get<AuthResponse>("/auth/me");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return {
        authenticated: false,
        user: null,
      };
    }
    throw error;
  }
};

/*
 * --------------------------------------------------
 * GOOGLE LOGIN
 * --------------------------------------------------
 */

export const loginWithGoogle = () => {
  window.location.href = `${API_BASE}/auth/google`;
};

/*
 * --------------------------------------------------
 * DEMO / GUEST LOGIN
 * --------------------------------------------------
 */

export const loginDemo = async (): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/demo");
  return response.data;
};

/*
 * --------------------------------------------------
 * LOGOUT
 * --------------------------------------------------
 */

export const logout = async (): Promise<void> => {
  await api.post("/auth/logout");
};

/*
 * --------------------------------------------------
 * HEALTH CHECK
 * --------------------------------------------------
 */

export const healthCheck = async () => {
  const response = await api.get("/health");
  return response.data;
};

/*
 * --------------------------------------------------
 * SEND CHAT MESSAGE (STANDARD REST)
 * --------------------------------------------------
 */

export const sendMessage = async (
  request: ChatRequest
): Promise<ChatResponse> => {
  try {
    const response = await api.post<ChatResponse>("/chat", {
      message: request.message,
      conversationId: request.conversationId ?? undefined,
    });
    return response.data;
  } catch (error) {
    console.error("[Frontend] API error:", error);
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error ??
        error.response?.data?.message ??
        error.message;
      throw new Error(message, { cause: error });
    }
    throw new Error("Unable to connect to the chat server.", { cause: error });
  }
};

/*
 * --------------------------------------------------
 * STREAM CHAT MESSAGE (SSE STREAMING)
 * --------------------------------------------------
 */

export interface StreamCallbacks {
  onStep?: (event: Extract<StreamEvent, { type: "step" }>["step"]) => void;
  onToken?: (delta: string) => void;
  onAction?: (actionData: Extract<StreamEvent, { type: "action" }>["actionData"]) => void;
  onSources?: (sources: Extract<StreamEvent, { type: "sources" }>["sources"]) => void;
  onDone?: (response: ChatResponse) => void;
  onError?: (error: string) => void;
}

export const streamChatMessage = async (
  request: ChatRequest,
  callbacks: StreamCallbacks
): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    credentials: "include",
    body: JSON.stringify({
      message: request.message,
      conversationId: request.conversationId,
    }),
  });

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errJson = await response.json();
      errorMessage = errJson.error || errorMessage;
    } catch {
      // fallback
    }
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable.");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalResponse: ChatResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const jsonStr = trimmed.replace(/^data:\s*/, "");
        if (!jsonStr) continue;

        try {
          const event: StreamEvent = JSON.parse(jsonStr);

          if (event.type === "step" && callbacks.onStep) {
            callbacks.onStep(event.step);
          } else if (event.type === "token" && callbacks.onToken) {
            callbacks.onToken(event.delta);
          } else if (event.type === "action" && callbacks.onAction) {
            callbacks.onAction(event.actionData);
          } else if (event.type === "sources" && callbacks.onSources) {
            callbacks.onSources(event.sources);
          } else if (event.type === "done") {
            finalResponse = event.response;
            if (callbacks.onDone) {
              callbacks.onDone(event.response);
            }
          } else if (event.type === "error" && callbacks.onError) {
            callbacks.onError(event.error);
          }
        } catch (parseErr) {
          console.warn("[SSE] Failed to parse stream event JSON:", parseErr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalResponse) {
    return {
      conversationId: request.conversationId || crypto.randomUUID(),
      message: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
      sources: [],
    };
  }

  return finalResponse;
};

export default api;