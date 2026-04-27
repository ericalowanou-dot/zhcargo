import { prisma } from "@/lib/prisma";
import { verifyHandoffToken } from "@/lib/handoff-jwt";
import { verifyAdminHandoffToken } from "@/lib/admin-handoff-jwt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "admin-handoff",
      name: "Admin ZH Cargo",
      credentials: {
        handoff: { label: "Jeton", type: "text" },
      },
      async authorize(credentials) {
        const handoff = credentials?.handoff;
        if (!handoff) {
          return null;
        }
        try {
          const { adminId, email, name } = await verifyAdminHandoffToken(
            handoff,
          );
          return {
            id: adminId,
            name,
            email,
            isAdmin: true,
          };
        } catch {
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "otp-handoff",
      name: "Connexion ZH Cargo",
      credentials: {
        handoff: { label: "Jeton", type: "text" },
      },
      async authorize(credentials) {
        const handoff = credentials?.handoff;
        if (!handoff) {
          return null;
        }
        try {
          const { clientId, phone } = await verifyHandoffToken(handoff);
          const client = await prisma.client.findUnique({
            where: { id: clientId },
          });
          if (!client || client.phone !== phone) {
            return null;
          }
          return {
            id: client.id,
            name: client.name ?? client.phone,
            clientId: client.id,
            phone: client.phone,
            country: client.country,
            isAdmin: false,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          name?: string | null;
          email?: string | null;
          clientId?: string;
          phone?: string;
          country?: string;
          isAdmin?: boolean;
        };
        if (u.isAdmin) {
          token.isAdmin = true;
          token.adminId = u.id;
          token.name = u.name;
          token.email = u.email ?? undefined;
          token.sub = u.id;
          delete token.clientId;
          delete token.phone;
          delete token.country;
          return token;
        }
        token.sub = u.id;
        token.clientId = u.clientId ?? u.id;
        token.phone = u.phone ?? "";
        token.name = u.name;
        token.country = u.country ?? "TG";
        delete token.isAdmin;
        delete token.adminId;
        delete token.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.isAdmin) {
        if (session.user) {
          session.user.id = String(token.sub ?? token.adminId);
          session.user.name = (token.name as string) || "";
          session.user.email = (token.email as string) || null;
          session.user.isAdmin = true;
        }
        return session;
      }
      if (session.user && token.clientId && token.phone) {
        session.user.id = String(token.sub ?? token.clientId);
        session.user.clientId = String(token.clientId);
        session.user.phone = String(token.phone);
        session.user.name = token.name as string;
        session.user.country = (token.country as string) || "TG";
        session.user.isAdmin = false;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
