"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * hCaptcha 客户端组件
 *
 * 工作机制：
 * 1. 挂载时动态注入 hCaptcha 官方 JS (https://js.hcaptcha.com/1/api.js)
 * 2. 在 div 上调用 window.hcaptcha.render() 渲染 widget
 * 3. 用户通过验证后,回调把 token 写入 props.onVerify(token)
 * 4. 用户点击外部的"提交"按钮时,父表单的 hidden input 持有最新 token 一起 POST 出去
 * 5. token 默认 120s 过期;过期后 widget 会变红并触发 onExpire 回调,我们把 hidden input 清空
 *
 * 设计为客户端组件("use client"),但仍可被服务端组件直接 import 使用。
 */

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "chalexpired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
          size?: "normal" | "compact" | "invisible";
          hl?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let hcaptchaScriptLoadingPromise: Promise<void> | null = null;

/**
 * 注入 hCaptcha 官方脚本(只注入一次,跨组件复用)
 */
function loadHCaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.hcaptcha) return Promise.resolve();

  if (hcaptchaScriptLoadingPromise) return hcaptchaScriptLoadingPromise;

  hcaptchaScriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-hcaptcha-script="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load hCaptcha script"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js";
    script.async = true;
    script.defer = true;
    script.dataset.hcaptchaScript = "true";
    script.onload = () => resolve();
    script.onerror = () => {
      hcaptchaScriptLoadingPromise = null;
      reject(new Error("Failed to load hCaptcha script"));
    };
    document.head.appendChild(script);
  });

  return hcaptchaScriptLoadingPromise;
}

export interface HCaptchaProps {
  /** hCaptcha sitekey,通常从服务端通过 NEXT_PUBLIC_HCAPTCHA_SITEKEY 传入 */
  sitekey: string;
  /** 校验通过回调,参数是 hCaptcha 返回的一次性 token */
  onVerify: (token: string) => void;
  /** token 过期/校验失败回调,父组件可以据此清空 hidden input */
  onExpire?: () => void;
  /** 主题 */
  theme?: "light" | "dark";
  /** 尺寸(可选) */
  size?: "normal" | "compact" | "invisible";
  /** 错误信息(可选) */
  errorMessage?: string | null;
}

export default function HCaptcha({
  sitekey,
  onVerify,
  onExpire,
  theme = "light",
  size = "normal",
  errorMessage,
}: HCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 持有最新的回调引用,避免 useEffect 频繁 re-render 时把 widget 拆了重装
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
  }, [onVerify, onExpire]);

  useEffect(() => {
    if (!sitekey) {
      setLoadError("hCaptcha sitekey is missing");
      return;
    }

    let cancelled = false;

    loadHCaptchaScript()
      .then(() => {
        if (cancelled) return;
        setScriptReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load hCaptcha");
      });

    return () => {
      cancelled = true;
    };
  }, [sitekey]);

  // 脚本就绪 + 容器挂载后渲染 widget
  useEffect(() => {
    if (!scriptReady) return;
    if (!containerRef.current) return;
    if (!window.hcaptcha) return;
    if (widgetIdRef.current) return; // 防止 StrictMode 双调用

    try {
      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey,
        theme,
        size,
        callback: (token: string) => onVerifyRef.current(token),
        "expired-callback": () => onExpireRef.current?.(),
        "chalexpired-callback": () => onExpireRef.current?.(),
        "error-callback": () => onExpireRef.current?.(),
      });
    } catch (err: any) {
      setLoadError(err?.message || "Failed to render hCaptcha");
    }

    return () => {
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptReady, sitekey, theme, size]);

  /**
   * 暴露给父组件的 reset 方法:widget 已通过验证但服务端拒绝时,
   * 让用户重新验证。
   */
  const reset = useCallback(() => {
    if (widgetIdRef.current && window.hcaptcha) {
      try {
        window.hcaptcha.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
    onExpireRef.current?.();
  }, []);

  // 把 reset 挂到 ref,父组件如果需要可以拿到
  // (本文件目前未导出,保留扩展点)
  void reset;

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      <div ref={containerRef} data-hcaptcha-widget="true" />
      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
