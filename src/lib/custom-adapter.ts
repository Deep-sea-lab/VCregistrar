import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "@prisma/client";
import type { Adapter, AdapterUser } from "@auth/core/adapters";

/**
 * 自定义 Prisma Adapter 包装器
 * 过滤掉 OAuth 提供者返回的 image 等不在 schema 中的字段
 */
export function CustomPrismaAdapter(prisma: PrismaClient): Adapter {
  const base = PrismaAdapter(prisma) as Adapter;

  return {
    ...base,
    createUser: base.createUser
      ? async (user) => {
          const { image, ...rest } = user as AdapterUser & { image?: string };
          return base.createUser!(rest as AdapterUser);
        }
      : undefined,
    updateUser: base.updateUser
      ? async (user) => {
          const { image, ...rest } = user as Partial<AdapterUser> & { image?: string };
          return base.updateUser!(rest as Parameters<NonNullable<Adapter["updateUser"]>>[0]);
        }
      : undefined,
  };
}