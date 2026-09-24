import axios from "axios";

import type {
  ChatRequest,
  ChatResponse,
} from "@one-front-door/shared-types";

const api = axios.create({
  baseURL:
    "http://localhost:5000/api",

  headers: {
    "Content-Type":
      "application/json",
  },
});

export const healthCheck =
  async () => {
    const response =
      await api.get("/health");

    return response.data;
  };

export const sendMessage =
  async (
    request: ChatRequest
  ): Promise<ChatResponse> => {
    const response =
      await api.post<ChatResponse>(
        "/chat",
        request
      );

    return response.data;
  };

export default api;