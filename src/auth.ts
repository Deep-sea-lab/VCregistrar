import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { CustomPrismaAdapter } from "@/lib/custom-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * 完整的 NextAuth 配置(只跑在 Node.js Runtime)
 * - 不在 Edge 中执行,所以可以引用 prisma / bcryptjs / adapter
 * - 通过 spread authConfig 把 Edge-safe 部分(providers 元信息、session/cookies/callbacks/secret/pages)继承过来
 * - providers 数组只会用在 Node 端,中间件用的是 authConfig(空 providers),不会引入这些大体积模块
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: CustomPrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          // 服务端认证信息回调: 同时返回注册时间与更新时间
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // 覆盖 jwt 回调(运行在 Node 端): OAuth 首次登录时,
    // NextAuth 默认从 adapter 返回的 user 不一定带 createdAt/updatedAt,
    // 这里从数据库补齐后写到 token。
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // 第一次登录 / Credentials: 优先取 user 上自带的字段
        if ((user as any).createdAt) {
          token.createdAt = (user as any).createdAt;
        }
        if ((user as any).updatedAt) {
          token.updatedAt = (user as any).updatedAt;
        }

        // OAuth 首次登录没带时间字段 -> 从数据库补齐
        if (!token.createdAt || !token.updatedAt) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id as string },
              select: { createdAt: true, updatedAt: true },
            });
            if (dbUser) {
              token.createdAt = token.createdAt ?? dbUser.createdAt;
              token.updatedAt = token.updatedAt ?? dbUser.updatedAt;
            }
          } catch {
            // 静默失败, 不影响登录流程
          }
        }
      }

      // 后续请求 / 旧 cookie: token 上可能没有时间字段(迁移前发放的 token)
      // 这里兜底从数据库读取一次, 以后每次续期都会带上
      if (token && token.id && (!token.createdAt || !token.updatedAt)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { createdAt: true, updatedAt: true },
          });
          if (dbUser) {
            token.createdAt = token.createdAt ?? dbUser.createdAt;
            token.updatedAt = token.updatedAt ?? dbUser.updatedAt;
          }
        } catch {
          // 静默失败
        }
      }

      // 显式调用 update() 时, 允许外部传入新的 updatedAt(例如修改名称后)
      if (trigger === "update" && session) {
        if ((session as any).updatedAt) {
          token.updatedAt = (session as any).updatedAt;
        }
      }

      return token;
    },
    // 覆盖 session 回调(运行在 Node 端): 兜底从数据库读取 createdAt/updatedAt
    // 避免旧 token / token 被转码 丢字段导致 session.user.createdAt 为 null
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).createdAt = (token as any).createdAt ?? null;
        (session.user as any).updatedAt = (token as any).updatedAt ?? null;

        // 兜底: 如果 token 仍然没拿到, 直接从 DB 查一次
        if (
          (!(session.user as any).createdAt ||
            !(session.user as any).updatedAt) &&
          token.id
        ) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { createdAt: true, updatedAt: true },
            });
            if (dbUser) {
              (session.user as any).createdAt = dbUser.createdAt;
              (session.user as any).updatedAt = dbUser.updatedAt;
            }
          } catch {
            // 静默失败
          }
        }
      }
      return session;
    },
    async signIn({ user, account }) {
      // 如果是 OAuth 登录(非 Credentials)
      if (account?.provider && account.provider !== "credentials") {
        // 检查是否已有该 provider 的账号记录
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (existingAccount) {
          // 已关联,直接放行
          return true;
        }

        // 不自动关联到现有邮箱账户 - 这是安全风险
        // 防止账户接管: 如果邮箱已存在,拒绝登录
        if (user?.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            // 邮箱已存在于另一账户,不自动关联
            // 用户需要登录后手动关联账户
            return false;
          }
        }
      }
      return true;
    },
  },
});
