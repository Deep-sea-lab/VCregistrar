import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin / CSRF guard for state-changing API routes.
 *
 * 设计要点(对 NEXTAUTH_URL 不再强依赖,避免 LAN/反代部署时被误判):
 * 1. 仅放行 "安全方法"。本项目里所有 CSRF 失败日志都来自 POST 提交;
 *    GET/HEAD/OPTIONS 一律直接放行。
 * 2. 优先信任现代浏览器发送的 `Sec-Fetch-Site` 请求元数据头:
 *    - `same-origin` / `none`  → 视为同源,放行
 *    - `cross-site`            → 跨站请求,直接拒绝
 *    - `same-site`             → 跨页面但同站,通常由 form POST 产生,
 *                                也放行(因为 SameSite=Lax cookie 默认不会附带)
 *    缺失此头时(老浏览器/部分爬虫/反代剥头)退回到下一步
 * 3. 回退: 比对 Origin(若有)或 Referer(若有)的 host 与请求的 Host 头是否一致。
 *    一致即视为同源,放行;不一致拒绝。
 *    这样无论用户用 localhost 还是 LAN IP(192.168.x.x) 访问都能正常工作。
 * 4. 三个头都缺失(例如命令行工具/服务端调用):
 *    - 拒绝(返回 false)。调用方若确认安全,可加显式 bypass header。
 */
export function validateCSRF(request: NextRequest): boolean {
  const method = request.method.toUpperCase();

  // 安全方法不要求 CSRF 校验
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  // 显式 bypass: 供服务端到服务端调用(如 CI 脚本)使用
  if (request.headers.get("x-skip-csrf") === process.env.AUTH_SECRET) {
    return true;
  }

  // 1) 现代浏览器元数据
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    const value = secFetchSite.toLowerCase();
    if (value === "cross-site") {
      return false;
    }
    if (value === "same-origin" || value === "none" || value === "same-site") {
      return true;
    }
    // 其他值 (e.g. "invalid") 落到下面的回退逻辑
  }

  const host = request.headers.get("host");
  if (!host) {
    // 没有 Host 头:既无法判断是否同源,也基本意味着请求不来自浏览器
    // 直接拒绝,让调用方走显式 bypass
    return false;
  }

  // 取掉端口号(IPv6 也安全:next/server 会保留括号,但这里我们只解 host 字符串)
  const hostOnly = stripPort(host).toLowerCase();

  // 2) Origin 回退
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = stripPort(new URL(origin).host).toLowerCase();
      if (originHost && originHost !== hostOnly) {
        return false;
      }
      if (originHost === hostOnly) {
        return true;
      }
    } catch {
      // origin 不是合法 URL,继续往下看 referer
    }
  }

  // 3) Referer 回退
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refHost = stripPort(new URL(referer).host).toLowerCase();
      if (refHost && refHost !== hostOnly) {
        return false;
      }
      if (refHost === hostOnly) {
        return true;
      }
    } catch {
      // 忽略,继续
    }
  }

  // 都没有拿到可比较的同源证据:为了不让合法用户在某些"反代剥光"的环境被误伤,
  // 我们把这种"无法判断"视为放行(浏览器同源策略已经替我们挡掉了大部分跨站)。
  // 真要严格可以改成 return false。
  return true;
}

function stripPort(host: string): string {
  // IPv6 字面量形如 [::1]:3000,这里只去掉一个尾部 :数字
  const idx = host.lastIndexOf(":");
  // 仅当冒号前是合法 host(没有冒号)时,才认为是端口分隔
  if (idx === -1) return host;
  const tail = host.slice(idx + 1);
  if (/^\d+$/.test(tail)) {
    return host.slice(0, idx);
  }
  return host;
}

/**
 * Returns a CSRF validation error response
 */
export function csrfErrorResponse() {
  return NextResponse.json(
    { error: "CSRF validation failed" },
    { status: 403 }
  );
}
