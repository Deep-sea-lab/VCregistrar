/**
 * hCaptcha 服务端验证工具
 *
 * 工作流程：
 * 1. 前端通过 hCaptcha widget 拿到一次性 token（h-captcha-response）
 * 2. 前端把 token 随表单一起 POST 到 /api/auth/login 或 /api/auth/register
 * 3. 后端调用本模块的 verifyHCaptcha() 把 token 发给 hCaptcha siteverify 接口校验
 * 4. 仅当 hCaptcha 返回 success: true 时,后端才继续走原来的登录/注册逻辑
 *
 * 环境变量：
 * - HCAPTCHA_SECRET: 服务端密钥(Secret Key),在 https://dashboard.hcaptcha.com/ 获取
 * - HCAPTCHA_SITEKEY: 前端 sitekey(可选项,主要用于文档/调试;真正渲染 widget 用的是 .env 的 NEXT_PUBLIC_HCAPTCHA_SITEKEY)
 * - NEXT_PUBLIC_HCAPTCHA_SITEKEY: 前端 sitekey(Site Key),**必须**在客户端组件中可用,所以带 NEXT_PUBLIC_ 前缀
 * - HCAPTCHA_BYPASS: 设为 "true" 时跳过校验(仅供本地开发/测试,生产请勿开启)
 */

export interface HCaptchaVerifyResult {
  success: boolean;
  /** 失败原因数组,hCaptcha 官方字段 */
  "error-codes"?: string[];
  /** 校验时间戳(ISO 8601),hCaptcha 官方字段 */
  challenge_ts?: string;
  /** 客户端 IP,hCaptcha 官方字段 */
  hostname?: string;
}

export interface VerifyOptions {
  /** 客户端可选传入,作为远端 IP 提交给 hCaptcha 供风控参考 */
  remoteIp?: string;
}

/**
 * 是否启用了 hCaptcha
 * - 当未配置 secret 时,关闭校验
 * - HCAPTCHA_BYPASS=true 时强制关闭(开发用)
 */
export function isHCaptchaEnabled(): boolean {
  if (!process.env.HCAPTCHA_SECRET) return false;
  if (process.env.HCAPTCHA_BYPASS === "true") return false;
  return true;
}

/**
 * 是否应该渲染前端 widget
 * - 与 isHCaptchaEnabled() 区别:这个用于在服务端组件中决定要不要把 sitekey 传给客户端
 * - 只在同时配置了 secret 和 NEXT_PUBLIC_HCAPTCHA_SITEKEY 时返回 true
 */
export function shouldRenderHCaptcha(): boolean {
  if (!isHCaptchaEnabled()) return false;
  return Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY);
}

/**
 * 获取前端 sitekey(给客户端组件用)
 */
export function getHCaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || "";
}

/**
 * 验证前端提交的 hCaptcha token
 * @param token 前端 hCaptcha widget 回调拿到的 h-captcha-response
 * @param options.remoteIp 可选,提交给 hCaptcha 提升风控准确度
 */
export async function verifyHCaptcha(
  token: string | undefined | null,
  options: VerifyOptions = {}
): Promise<HCaptchaVerifyResult> {
  const secret = process.env.HCAPTCHA_SECRET;

  // 未配置 secret / 被绕过 -> 视作关闭,直接放行
  if (!isHCaptchaEnabled()) {
    return { success: true };
  }

  // 前端没传 token -> 直接拒绝
  if (!token || typeof token !== "string" || token.trim() === "") {
    return {
      success: false,
      "error-codes": ["missing-input-response"],
    };
  }

  const params = new URLSearchParams();
  params.append("secret", secret as string);
  params.append("response", token);
  if (options.remoteIp) {
    params.append("remoteip", options.remoteIp);
  }

  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      // hCaptcha 官方接口,超时控制在 5s
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        success: false,
        "error-codes": [`http-${res.status}`],
      };
    }

    const data = (await res.json()) as HCaptchaVerifyResult;
    return data;
  } catch (err) {
    // 网络失败时**默认拒绝**,避免放行任意请求
    return {
      success: false,
      "error-codes": ["network-error"],
    };
  }
}
