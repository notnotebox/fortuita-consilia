import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordTag?: string | null;
    } & DefaultSession["user"];
  }
}
