import type { User } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      provider: string;
      providerId: string | null;
    }
  }
}

export {};