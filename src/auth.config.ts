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
    // Edge 端的最小 jwt: 只在 login 触发时跑,作为 auth.ts jwt 的无 DB 时的轻量语义保留
    // (实际登录路径在 Node 端, 会被 auth.ts 的 jwt 覆盖, 详见 auth.ts 注释)
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
        // 尝试从 user 上携带 createdAt/updatedAt(来自 authorize / adapter)
        if ((user as any).createdAt) {
          token.createdAt = (user as any).createdAt;
        }
        if ((user as any).updatedAt) {
          token.updatedAt = (user as any).updatedAt;
        }
      }
      return token;
    },
    // Edge 端 (middleware) 的 session: 只需判断登录态, 透出 id/role
    // createdAt/updatedAt 由 auth.ts 覆盖的 session 回调(运行在 Node 端)从 DB 兑底处理
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
