"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import HCaptcha from "@/components/HCaptcha";

/**
 * 注册表单(客户端组件)
 * - 整合 hCaptcha 校验
 * - 提交时通过 fetch() 调用 /api/auth/register,
 *   把 hCaptcha token 一同放进 JSON body
 * - 服务端 route handler 会先校验 hCaptcha,再进行密码强度 / 重名检查并落库
 */
export interface RegisterFormProps {
  callbackUrl?: string;
  hcaptchaSiteKey: string;
}

export default function RegisterForm({
  callbackUrl,
  hcaptchaSiteKey,
}: RegisterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const [hcaptchaError, setHcaptchaError] = useState<string | null>(null);

  const hcaptchaEnabled = Boolean(hcaptchaSiteKey);

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
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/auth/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              password,
              hcaptchaToken: hcaptchaEnabled ? hcaptchaToken : undefined,
            }),
          }
        );

        // 服务端成功时通过 302 redirect,失败时也通过 302 + ?error=xxx
        // fetch 默认跟随 redirect,200 的话就是最终的目的页
        if (res.redirected || res.url.includes("/login")) {
          // 注册成功,跟着服务端重定向走
          window.location.href = res.url;
          return;
        }

        if (res.ok) {
          // 部分实现会直接返回 200 + JSON,此处也兜底跳到 /login
          const successMsg = encodeURIComponent(
            "Account created successfully. Please sign in."
          );
          window.location.href = callbackUrl
            ? `/login?success=${successMsg}&callbackUrl=${encodeURIComponent(callbackUrl)}`
            : `/login?success=${successMsg}`;
          return;
        }

        // 失败
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Registration failed. Please try again.");
        setHcaptchaToken(null);
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
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          placeholder="Your name"
        />
      </div>

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
          minLength={8}
          autoComplete="new-password"
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          placeholder="Re-enter password"
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
        {isPending ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}
