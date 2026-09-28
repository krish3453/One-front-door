import axios from "axios";

import type {
  ChatRequest,
  ChatResponse,
} from "@one-front-door/shared-types";

const api = axios.create({
  baseURL: "http://localhost:5000/api",

  headers: {
    "Content-Type": "application/json",
  },

  withCredentials: true,
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
    console.log(
      "[Frontend] Sending message:",
      {
        message: request.message,
        conversationId:
          request.conversationId ??
          null,
      }
    );

    try {
      const response =
        await api.post<ChatResponse>(
          "/chat",
          {
            message:
              request.message,

            conversationId:
              request.conversationId ??
              undefined,
          }
        );

      console.log(
        "[Frontend] Received response:",
        {
          conversationId:
            response.data
              .conversationId,

          agent:
            response.data
              .message?.agent,

          sources:
            response.data
              .sources?.length ?? 0,
        }
      );

      return response.data;

    } catch (error) {
      console.error(
        "[Frontend] API error:",
        error
      );

      if (
        axios.isAxiosError(error)
      ) {
        const message =
          error.response?.data?.error ??
          error.response?.data?.message ??
          error.message;

        throw new Error(message);
      }

      throw new Error(
        "Unable to connect to the chat server."
      );
    }
  };

export default api;