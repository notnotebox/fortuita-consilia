import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const discordClientId =
  process.env.DISCORD_CLIENT_ID?.trim() ||
  process.env.AUTH_DISCORD_ID?.trim() ||
  undefined;
const discordClientSecret =
  process.env.DISCORD_CLIENT_SECRET?.trim() ||
  process.env.AUTH_DISCORD_SECRET?.trim() ||
  undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Discord({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      authorization: {
        params: {
          scope: "identify email",
        },
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async signIn({ account, user }) {
      if (!account) return false;

      // Keep auth surface explicit for now: only Discord sign-in is supported.
      if (account.provider !== "discord") {
        return false;
      }

      return Boolean(user.id);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
