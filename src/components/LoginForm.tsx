"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import HCaptcha from "@/components/HCaptcha";

/**
 * 登录表单(客户端组件)
 * - 整合 hCaptcha 校验,未通过时禁用提交按钮
 * - 通过 signIn(来自 next-auth/react)调 Credentials provider,
 *   把 hCaptcha token 作为 form 字段一起传过去;
 *   服务端在 authorize() 之前由 /api/auth/login 的 route handler 进行校验
 *   (见 src/app/api/auth/login/route.ts)
 *
 * 实际上为了同时支持 Server Action 风格和 client 调用,
 * 我们改用 fetch() 直接 POST 到 /api/auth/login,把 token 放在 body 里。
 */
export interface LoginFormProps {
  callbackUrl?: string;
  /** hCaptcha sitekey,缺省时表示关闭 */
  hcaptchaSiteKey: string;
}

export default function LoginForm({
  callbackUrl,
  hcaptchaSiteKey,
}: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const [hcaptchaError, setHcaptchaError] = useState<string | null>(null);

  const hcaptchaEnabled = Boolean(hcaptchaSiteKey);

  // hCaptcha 通过时,token 默认 120s 过期;若 widget 重新生成或被清除,我们同步本地状态
  const handleHCaptchaVerify = (token: string) => {
    setHcaptchaToken(token);
    setHcaptchaError(null);
  };
  const handleHCaptchaExpire = () => {
    setHcaptchaToken(null);
    setHcaptchaError("hCaptcha token expired, please verify again.");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (hcaptchaEnabled && !hcaptchaToken) {
      setHcaptchaError("Please complete the hCaptcha challenge.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            hcaptchaToken: hcaptchaEnabled ? hcaptchaToken : undefined,
          }),
        });

        if (res.ok) {
          // 走 next-auth 的 signIn(credentials) 同步会话 cookie
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setError("Invalid email or password. Please try again.");
            setHcaptchaToken(null);
            return;
          }
          router.push(callbackUrl || "/dashboard");
          router.refresh();
          return;
        }

        // 4xx/5xx 处理
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };

        if (data.code === "HCAPTCHA_FAILED" || res.status === 400) {
          setError(
            data.error || "hCaptcha verification failed. Please try again."
          );
        } else if (res.status === 429) {
          setError("Too many login attempts. Please try again later.");
        } else if (res.status === 401) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(data.error || "Login failed. Please try again.");
        }

        // 服务端拒绝后清空 hCaptcha token,让用户重新验证
        setHcaptchaToken(null);
        // 主动通知 widget 重新渲染(若有 errorMessage 提示)
        setHcaptchaError("hCaptcha session ended, please verify again.");
      } catch (err) {
        setError("Network error. Please try again.");
        setHcaptchaToken(null);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          placeholder="Enter your password"
        />
      </div>

      {hcaptchaEnabled && (
        <div className="pt-1">
          <HCaptcha
            sitekey={hcaptchaSiteKey}
            onVerify={handleHCaptchaVerify}
            onExpire={handleHCaptchaExpire}
            errorMessage={hcaptchaError}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || (hcaptchaEnabled && !hcaptchaToken)}
        className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
