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
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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
