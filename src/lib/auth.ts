import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash || user.status !== "ACTIVE" || user.deletedAt) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      // Revalidate the account status periodically so suspended/deactivated
      // users lose access before their JWT expires.
      const now = Date.now();
      const lastCheck = typeof token.statusCheckedAt === "number" ? token.statusCheckedAt : 0;
      if (token.id && (trigger === "update" || now - lastCheck > 5 * 60 * 1000)) {
        try {
          const account = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, status: true, deletedAt: true },
          });
          if (!account || account.status !== "ACTIVE" || account.deletedAt) {
            token.invalid = true;
          } else {
            token.role = account.role;
            token.invalid = false;
          }
        } catch {
          // Do not invalidate the session on transient DB errors.
        }
        token.statusCheckedAt = now;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        (session.user as { invalid?: boolean }).invalid = Boolean(token.invalid);
      }
      return session;
    },
  },
};
