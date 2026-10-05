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

  /*
   * IMPORTANT
   *
   * Express session uses a cookie.
   *
   * This makes Axios send the session
   * cookie with API requests.
   */
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

export const getCurrentUser =
  async (): Promise<AuthResponse> => {

    try {

      const response =
        await api.get<AuthResponse>(
          "/auth/me"
        );

      return response.data;

    } catch (error) {

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
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
 *
 * OAuth starts by navigating the browser to
 * the backend endpoint.
 */

export const loginWithGoogle =
  () => {

    window.location.href =
      "http://localhost:5000/api/auth/google";
  };

/*
 * --------------------------------------------------
 * DEMO / GUEST LOGIN
 * --------------------------------------------------
 */

export const loginDemo =
  async (): Promise<AuthResponse> => {

    const response =
      await api.post<AuthResponse>(
        "/auth/demo"
      );

    return response.data;
  };

/*
 * --------------------------------------------------
 * LOGOUT
 * --------------------------------------------------
 */

export const logout =
  async (): Promise<void> => {

    await api.post(
      "/auth/logout"
    );
  };

/*
 * --------------------------------------------------
 * HEALTH CHECK
 * --------------------------------------------------
 */

export const healthCheck =
  async () => {

    const response =
      await api.get(
        "/health"
      );

    return response.data;
  };

/*
 * --------------------------------------------------
 * SEND CHAT MESSAGE
 * --------------------------------------------------
 */

export const sendMessage =
  async (
    request: ChatRequest
  ): Promise<ChatResponse> => {

    console.log(
      "[Frontend] Sending message:",
      {
        message:
          request.message,

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

        throw new Error(
          message
        );
      }

      throw new Error(
        "Unable to connect to the chat server."
      );
    }
  };

export default api;