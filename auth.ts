import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

type DiscordMe = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator: string;
};

const discordClientId =
  process.env.DISCORD_CLIENT_ID?.trim() || process.env.AUTH_DISCORD_ID?.trim();
const discordClientSecret =
  process.env.DISCORD_CLIENT_SECRET?.trim() || process.env.AUTH_DISCORD_SECRET?.trim();

if (!discordClientId || !discordClientSecret) {
  throw new Error("Missing Discord OAuth env vars (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET).");
}

function buildDiscordTag(profile: DiscordMe): string {
  if (profile.discriminator && profile.discriminator !== "0") {
    return `${profile.username}#${profile.discriminator}`;
  }
  return profile.username;
}

function buildDiscordAvatarUrl(profile: DiscordMe): string | null {
  if (!profile.avatar) return null;
  const ext = profile.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${ext}?size=256`;
}

async function syncDiscordProfile(input: {
  userId: string;
  accessToken: string;
}): Promise<void> {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Discord profile fetch failed with status ${response.status}`);
  }

  const profile = (await response.json()) as DiscordMe;
  if (!profile?.id || !profile?.username) {
    throw new Error("Discord profile payload missing required fields");
  }

  const nextName = profile.global_name || profile.username;
  const nextImage = buildDiscordAvatarUrl(profile);
  const nextDiscordTag = buildDiscordTag(profile);

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      name: nextName,
      image: nextImage,
      discordTag: nextDiscordTag,
    },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  basePath: "/api/auth",
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signOut: "/",
  },
  providers: [
    Discord({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      authorization: {
        params: {
          scope: "identify",
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

      if (user.id && typeof account.access_token === "string" && account.access_token.length > 0) {
        try {
          await syncDiscordProfile({
            userId: user.id,
            accessToken: account.access_token,
          });
        } catch (error) {
          console.warn("Discord profile sync failed:", error);
        }
      }

      return Boolean(user.id);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { discordTag: true },
        });
        session.user.discordTag = dbUser?.discordTag ?? null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to home after logout if no callback provided
      if (url === baseUrl || url.includes("0.0.0.0")) {
        return "/";
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
});
