import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe 轻量级 NextAuth 配置
 * ⚠️ 这个文件会在 Edge Runtime (middleware) 中执行
 * 不能引用任何 Node.js 专属模块: prisma, bcryptjs, fs, crypto(部分), @auth/prisma-adapter 等
 *
 * 只保留 middleware 用到的: providers 元信息、session/cookies/jwt/callbacks、pages、secret
 * 完整的配置(adapter、Credentials authorize) 在 auth.ts 中通过 spread 合并
 */
export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
      },
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  // providers 留空数组在中间件中,只用于让 next-auth 识别类型
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
