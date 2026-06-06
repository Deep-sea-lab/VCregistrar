# VCregistrar

![VCregistrar Banner](https://raw.githubusercontent.com/Deep-sea-lab/VCregistrar/main/public/banner.png)

一个基于 Next.js 15 和 Auth.js v5 构建的集中式身份认证系统。支持 OAuth（GitHub、Microsoft Entra ID）以及安全的邮箱密码登录，并提供基于 JWT 的会话管理、限流防护、CSRF 保护、审计日志等生产级安全特性。

## 语言 / Languages

- [English](./README.md)
- 简体中文

## 项目特性

- 多种登录方式
  - GitHub OAuth 2.0
  - Microsoft Entra ID
  - 邮箱 + 密码（bcryptjs 哈希）
- hCaptcha 人机验证：登录 / 注册页可选用，服务端二次校验，默认关闭
- 基于 JWT 的无状态会话（默认 30 天）
- 使用 Prisma + PostgreSQL 进行数据持久化
- 基于 Upstash Redis 的边缘限流（滑动窗口 20 次/60 秒）
- 中间件级别的路由保护与限流
- Origin/Referer 双重校验的 CSRF 保护
- 安全响应头（X-Content-Type-Options、X-Frame-Options、Referrer-Policy、Permissions-Policy、X-XSS-Protection）
- 完整的审计日志，覆盖注册、登录、登出、邮箱验证、OAuth 事件、hCaptcha 失败等
- 用户仪表盘：资料管理、修改密码、修改名称、登出所有设备、关联/解绑 OAuth 账号
- Gravatar 头像集成（SHA-256 哈希）
- Edge-safe 配置：中间件 bundle 不会引入 Prisma 等 Node.js 专属模块
- TypeScript 严格模式 + Tailwind CSS v4

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15（App Router） |
| 认证 | Auth.js v5（next-auth 5.0.0-beta） |
| ORM | Prisma 6 |
| 数据库 | PostgreSQL |
| 缓存/限流 | Upstash Redis |
| 密码哈希 | bcryptjs |
| 样式 | Tailwind CSS v4 |
| 语言 | TypeScript 5 |

## 快速开始

### 环境要求

- Node.js 18+（推荐 20+）
- pnpm / npm / yarn / bun（项目使用 bun 作为默认包管理器，可按需替换）
- 一个运行中的 PostgreSQL 实例
- （可选）Upstash Redis 账户，用于启用生产级限流

### 安装

```bash
# 克隆仓库
git clone https://github.com/Deep-sea-lab/VCregistrar.git
cd VCregistrar

# 安装依赖
bun install
# 或
npm install
# 或
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件，并填入以下变量：

```env
# --- 数据库 ---
DATABASE_URL="postgresql://user:password@localhost:5432/vcregistrar"
DIRECT_URL="postgresql://user:password@localhost:5432/vcregistrar"

# --- Auth.js ---
AUTH_SECRET="使用 openssl rand -base64 32 生成"
NEXTAUTH_URL="http://localhost:3000"

# --- GitHub OAuth ---
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# --- Microsoft Entra ID ---
AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID="your-entra-id-client-id"
AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET="your-entra-id-client-secret"

# --- Upstash Redis（可选）---
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

#### `AUTH_SECRET`

用于签名会话 JWT 的 32 字节随机字符串，是生产环境最重要的密钥。

- 本地生成：
  ```bash
  openssl rand -base64 32
  ```
- Vercel 配置：打开项目 → Settings → Environment Variables → 添加 `AUTH_SECRET`，将生成的值粘贴到 Value 字段，勾选所有环境（Production、Preview、Development）。

#### `NEXTAUTH_URL`

部署的规范化公网地址，用于 OAuth 回调和 CSRF 校验。

- 本地开发：`http://localhost:3000`
- 生产环境：`https://your-domain.com`（不要带末尾斜杠）

#### `DATABASE_URL` 与 `DIRECT_URL`

两个变量共同告诉 Prisma 如何连接 PostgreSQL。

- `DATABASE_URL`：运行时连接，被部署后的应用使用。
- `DIRECT_URL`：仅用于迁移，跳过 PgBouncer。当 `DATABASE_URL` 走连接池时必须配置。

本地开发时，两者指向同一个本地 PostgreSQL 实例：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vcregistrar"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/vcregistrar"
```

托管到 Supabase（推荐）：

1. 登录 [supabase.com/dashboard](https://supabase.com/dashboard) 并打开（创建）项目。
2. 进入 Project Settings → Database。
3. 在 Connection string 中切换到 URI 标签页，会看到三种连接串：Direct、Transaction pooler、Session pooler。
4. 把 Direct 连接串复制到 `DIRECT_URL`（端口是 `5432`）。
5. 把 Transaction pooler 连接串复制到 `DATABASE_URL`（端口是 `6543`）。具体格式见下方「生产数据库连接」一节。

#### `AUTH_GITHUB_ID` 与 `AUTH_GITHUB_SECRET`

GitHub provider 的 OAuth 凭据。

1. 打开 [github.com/settings/developers](https://github.com/settings/developers) → OAuth Apps → New OAuth App。
2. Application name 任意填写（例如 `VCregistrar Dev`）。
3. Homepage URL 填 `NEXTAUTH_URL`。
4. Authorization callback URL 填 `${NEXTAUTH_URL}/api/auth/callback/github`（例如 `http://localhost:3000/api/auth/callback/github`）。
5. 点击 Register application。在新页面点击 Generate a new client secret，**立即**复制（GitHub 只展示一次），粘贴到 `AUTH_GITHUB_SECRET`。
6. 把页面顶部的 Client ID 复制到 `AUTH_GITHUB_ID`。

#### `AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID` 与 `AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET`

Microsoft Entra ID 的 OAuth 凭据。

1. 登录 [Azure Portal](https://portal.azure.com/)，搜索 Microsoft Entra ID。
2. 进入 App registrations → New registration。
3. 填写 Name（例如 `VCregistrar`），Supported account type 选择单租户（Accounts in this organizational directory only），Redirect URI 暂时留空，点击 Register。
4. 在 Overview 页面，把 Application (client) ID 复制到 `AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID`。
5. 进入 Certificates & secrets → Client secrets → New client secret。填写描述和过期时间，点击 Add，把 Value（**不是** Secret ID）复制到 `AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET`。该值只展示一次。
6. 进入 Authentication → Add a platform → Web。Redirect URI 填 `${NEXTAUTH_URL}/api/auth/callback/microsoft-entra-id`（例如 `http://localhost:3000/api/auth/callback/microsoft-entra-id`），在 Implicit grant 下勾选 Access tokens 和 ID tokens，点击 Configure。
7. 如果是单租户应用，项目中可再设置 `AUTH_MICROSOFT_ENTRA_ID_ISSUER`（默认 issuer 是 `https://login.microsoftonline.com/common/v2.0`）。

#### `UPSTASH_REDIS_REST_URL` 与 `UPSTASH_REDIS_REST_TOKEN`

供 Edge 限流使用。**可选**：不配置时限流自动关闭。

1. 登录 [console.upstash.com](https://console.upstash.com/)。
2. 创建新的 Redis 数据库。选择离部署最近的区域（例如 Supabase 池在 ap-southeast-1 则选 Singapore），勾选 TLS Enabled，点击 Create。
3. 在数据库详情页向下滚动到 REST API，复制 `UPSTASH_REDIS_REST_URL`（形如 `https://xxx-12345.upstash.io`）和 `UPSTASH_REDIS_REST_TOKEN`。
4. 粘贴到本地 `.env` 或托管平台的环境变量设置（Vercel → Settings → Environment Variables）。
5. Vercel 修改环境变量后必须重新部署，新值只对新构建生效。

#### `HCAPTCHA_SECRET` 与 `NEXT_PUBLIC_HCAPTCHA_SITEKEY`（可选）

为邮箱密码登录、注册页添加人机验证。hCaptcha **默认关闭**：只有同时设置了 `HCAPTCHA_SECRET` 和 `NEXT_PUBLIC_HCAPTCHA_SITEKEY`，才会渲染 widget 并强制服务端校验。OAuth 流程不受影响。

1. 在 [dashboard.hcaptcha.com](https://dashboard.hcaptcha.com/) 注册账号（免费版即可），点击 **New Site** 新建站点。
2. 填写 Site name（任意，例如 `VCregistrar`），在 Hosts 中添加需要保护的域名（`localhost`、生产域名等），点击 **Save**。
3. 在站点详情页把 **Site Key** 复制到 `NEXT_PUBLIC_HCAPTCHA_SITEKEY`。
4. 把 **Secret** 复制到 `HCAPTCHA_SECRET`。Secret 是仅服务端可见的机密，绝不能提交到仓库。
5. 重启开发服务器 / 重新部署，让新环境变量生效。

```env
# --- hCaptcha（可选，两个变量必须同时设置才生效）---
HCAPTCHA_SECRET="your-hcaptcha-secret"
NEXT_PUBLIC_HCAPTCHA_SITEKEY="your-hcaptcha-sitekey"
```

相关变量：

- `HCAPTCHA_BYPASS="true"`：强制服务端跳过 hCaptcha 校验。**仅供本地开发使用，生产环境绝对不要设置**。未设置（或值不为 `"true"`）时绕过关闭。
- 服务端通过 `https://api.hcaptcha.com/siteverify` 校验 token，超时 5 秒；校验失败时登录接口返回 HTTP 400（`code: "HCAPTCHA_FAILED"`），注册接口返回 `?error=HCAPTCHA_FAILED` 重定向。错误信息在 `src/app/login/page.tsx`、`src/app/register/page.tsx` 的错误字典中映射。
- 客户端组件位于 `src/components/HCaptcha.tsx`，服务端工具位于 `src/lib/hcaptcha.ts`。hCaptcha 脚本（`https://js.hcaptcha.com/1/api.js`）仅在启用 hCaptcha 时按需懒加载，未启用时不会产生任何额外网络请求。

需要关闭时直接取消上述两个变量（Vercel 改完别忘了重新部署）即可。


### 初始化数据库

```bash
# 生成 Prisma Client
bun run db:generate

# 同步 schema 到数据库（开发环境）
bun run db:push

# 或使用迁移（生产环境推荐）
bun run db:migrate
```

如果使用纯 SQL 初始化，可执行 `prisma/init.sql`：

```bash
psql "$DATABASE_URL" -f prisma/init.sql
```

### 启动开发服务器

```bash
bun run dev
# 或
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。

### 构建与启动生产环境

```bash
bun run build
bun run start
```

## 常用脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动开发服务器 |
| `bun run build` | 构建生产版本 |
| `bun run start` | 启动生产服务器 |
| `bun run lint` | 运行 ESLint |
| `bun run db:generate` | 生成 Prisma Client |
| `bun run db:push` | 将 schema 推送到数据库 |
| `bun run db:migrate` | 运行数据库迁移 |
| `bun run db:studio` | 启动 Prisma Studio 数据浏览器 |

## OAuth 接入指引

### GitHub

1. 打开 GitHub Settings → Developer settings → OAuth Apps → New OAuth App。
2. Homepage URL 填入 `http://localhost:3000`。
3. Authorization callback URL 填入 `http://localhost:3000/api/auth/callback/github`。
4. 创建后复制 Client ID 与 Client Secret，分别填入 `AUTH_GITHUB_ID` 和 `AUTH_GITHUB_SECRET`。

### Microsoft Entra ID

1. 在 Azure Portal 注册应用（App registrations）。
2. 配置重定向 URI：`http://localhost:3000/api/auth/callback/microsoft-entra-id`。
3. 在 Certificates & secrets 创建客户端密钥。
4. 复制 Application (client) ID 与 Secret，分别填入 `AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID` 和 `AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET`。

## hCaptcha 接入指引

hCaptcha 为邮箱密码登录 / 注册表单增加人机验证挑战。**默认关闭**，只有同时设置 `HCAPTCHA_SECRET`（服务端）和 `NEXT_PUBLIC_HCAPTCHA_SITEKEY`（前端）才会启用。

1. 打开 [dashboard.hcaptcha.com](https://dashboard.hcaptcha.com/)，登录后点击 **New Site** 新建站点。
2. 在 Hosts 中添加你将部署的所有域名（本地开发需要 `localhost`、`127.0.0.1`，生产环境需要 `your-domain.com`），保存。
3. 站点详情页的 **Site Key**（浏览器 widget 使用的公钥）填入 `NEXT_PUBLIC_HCAPTCHA_SITEKEY`。
4. 同页的 **Secret**（服务端校验用的密钥）填入 `HCAPTCHA_SECRET`。**不要**把 Secret 提交到代码仓库。
5. 同样在托管平台（Vercel → Settings → Environment Variables）添加这两个变量，然后重新部署。

```env
# .env（不要提交到仓库）
HCAPTCHA_SECRET="0x00000000-0000-0000-0000-000000000000"
NEXT_PUBLIC_HCAPTCHA_SITEKEY="10000000-ffff-ffff-ffff-000000000001"
```

校验流程：

1. 用户完成 hCaptcha 挑战后，浏览器 widget 回调拿到一次性 token（`h-captcha-response`）。
2. 表单把 token 一并提交到 `/api/auth/login` 或 `/api/auth/register`。
3. 服务端调用 `https://api.hcaptcha.com/siteverify` 校验；只要返回 `success !== true`，请求直接被拒绝（HTTP 400）并写入审计日志。
4. 通过后才会进入原来的限流 / CSRF / 凭据校验逻辑。

注意事项：

- OAuth（GitHub、Microsoft）不受 hCaptcha 控制。如需给 OAuth 回调也加，可参考在 `src/auth.ts` 中实现（默认未启用）。
- `HCAPTCHA_BYPASS="true"` 强制跳过校验。**仅**本地使用，生产环境绝不要设。
- widget 脚本按需懒加载，访问其他页面的用户完全感知不到 hCaptcha 存在。
- 错误码 `HCAPTCHA_FAILED` 已在登录/注册错误字典中映射为友好提示。

## 项目结构

```
VCregistrar/
├── prisma/
│   ├── schema.prisma          # Prisma 数据模型
│   └── init.sql               # 纯 SQL 初始化脚本
├── public/
│   └── oauth-demo.html        # OAuth 演示页
├── src/
│   ├── app/
│   │   ├── (auth)/            # 旧式登录/注册路由组
│   │   ├── api/               # API 路由
│   │   │   ├── account/       # 账户管理（改密、改名、登出所有设备）
│   │   │   └── auth/          # 认证 API（登录、注册、回调、验证、登出、会话）
│   │   ├── dashboard/         # 用户仪表盘
│   │   ├── login/             # 登录页
│   │   ├── register/          # 注册页
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   └── globals.css        # 全局样式
│   ├── components/            # 共享组件（Header、仪表盘面板等）
│   ├── lib/                   # 工具库
│   │   ├── audit-log.ts       # 审计日志
│   │   ├── csrf.ts            # CSRF 校验
│   │   ├── custom-adapter.ts  # 自定义 Prisma Adapter
│   │   ├── gravatar.ts        # Gravatar 工具
│   │   ├── prisma.ts          # Prisma 单例
│   │   └── rate-limit.ts      # Upstash 限流
│   ├── auth.config.ts         # Edge-safe Auth.js 轻量配置
│   ├── auth.ts                # 完整 Auth.js 配置（仅 Node.js 端）
│   └── middleware.ts          # 边缘中间件：路由保护 + 限流
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 安全设计

### 1. Edge-safe 拆分

中间件运行在 Edge Runtime 中，不能加载 Prisma、bcryptjs 等 Node.js 专属模块。鉴于此：

- `src/auth.config.ts` 仅包含 Edge-safe 的 providers 元信息、session/cookies/callbacks/pages/secret。
- `src/auth.ts` 通过 spread 继承 `authConfig`，再补充 Node 端的 adapter、Credentials `authorize` 等。
- `src/middleware.ts` 调用 `NextAuth(authConfig)` 而非导入 `auth.ts`。

这一拆分避免了 Edge bundle 因引用 Prisma 而构建失败或体积膨胀。

### 2. 限流

- 基于 Upstash Redis 的滑动窗口算法（20 次/60 秒）。
- 默认应用于 `/api/auth/callback` 和 `/api/auth/verify`。
- 未配置 Upstash 时自动放行（适合本地开发）。

### 3. CSRF 保护

`src/lib/csrf.ts` 提供与 NEXTAUTH_URL 解耦的同源校验，避免 LAN/反代部署时被误判：

- 仅对**非安全方法**（POST/PUT/PATCH/DELETE）做校验，GET/HEAD/OPTIONS 直接放行。
- 优先信任浏览器元数据头 `Sec-Fetch-Site`：`same-origin` / `same-site` / `none` 放行，`cross-site` 拒绝；缺失时回退。
- 回退到 `Origin` / `Referer`：取其 host 与请求 `Host` 头比较，相同视为同源。`NEXTAUTH_URL` 不再作为唯一白名单，因此用 `http://192.168.x.x:3000` 与 `http://localhost:3000` 访问同样可用。
- 校验失败时返回 HTTP 403，并把事件写入审计日志（`action: LOGIN_ATTEMPT` / `REGISTRATION_ATTEMPT`，`details: "CSRF validation failed"`）。
- 内部脚本/CI 可发送 `X-Skip-CSRF: <AUTH_SECRET>` 头来显式绕过（生产环境请勿在浏览器侧启用）。

### 4. 安全响应头

通过 `next.config.ts` 全局注入：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### 5. OAuth 账户关联策略

为防止账户接管攻击，OAuth 登录时：

- 若该 OAuth provider 已绑定到当前用户，放行。
- 若 OAuth 返回的邮箱已属于另一本地账户，拒绝登录。用户需要在仪表盘手动关联 provider。

### 6. 审计日志

`src/lib/audit-log.ts` 提供统一的审计日志入口，覆盖以下事件：

- `REGISTRATION_ATTEMPT` / `REGISTRATION_SUCCESS` / `REGISTRATION_FAILED`
- `LOGIN_ATTEMPT` / `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `OAUTH_LOGIN_ATTEMPT` / `OAUTH_LOGIN_SUCCESS` / `OAUTH_LOGIN_FAILED`
- `EMAIL_VERIFICATION_REQUESTED` / `EMAIL_VERIFICATION_SUCCESS` / `EMAIL_VERIFICATION_FAILED`
- `LOGOUT`

日志会脱敏处理邮箱（仅保留前两位 + 域名）。生产环境可替换为 Datadog、CloudWatch 等外部服务。

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 邮箱密码注册 |
| POST | `/api/auth/login` | 邮箱密码登录（返回 JWT） |
| GET/POST | `/api/auth/[...nextauth]` | Auth.js 处理器 |
| GET/POST | `/api/auth/callback/:provider` | OAuth 回调（含限流） |
| POST | `/api/auth/verify` | 邮箱验证（含限流） |
| POST | `/api/auth/signout` | 登出 |
| GET | `/api/auth/session` | 获取当前会话 |
| GET | `/api/auth/avatar` | 头像代理 |
| POST | `/api/account/change-password` | 修改密码 |
| POST | `/api/account/change-name` | 修改显示名 |
| POST | `/api/account/sign-out-all` | 登出所有设备 |

## 数据模型

- `users` — 用户表，存储注册用户信息，支持 OAuth 与密码登录。
- `accounts` — OAuth 账号绑定表，关联 GitHub、Microsoft Entra ID 等。
- `sessions` — 数据库会话表（项目当前使用 JWT 策略，此表保留以备兼容）。
- `verification_tokens` — 邮箱验证令牌表。

详细字段见 `prisma/schema.prisma`。

## 部署

- 数据库：托管 PostgreSQL（Supabase、Neon、RDS 等）。
- 缓存：Upstash Redis Serverless。
- 托管：Vercel（首选，已为 Next.js 优化）或自托管。

### 上线前检查清单

- 重新生成 `AUTH_SECRET` 并存入托管平台的 Secret Manager，**绝不**复用开发环境的值。
- 将 `NEXTAUTH_URL` 设为生产域名（不带末尾斜杠）。
- 在 GitHub 与 Microsoft Entra ID 中更新 OAuth 回调 URL，使其与生产域名一致。
- 接入生产级日志服务（用 Datadog、CloudWatch、Axiom 等替换 `logAudit` 中的 `console.*`）。
- 如果托管平台不自动跑 `postinstall`，请设置 `nodeLinker: "hoisted"` 并在构建时显式生成 Prisma Client。Vercel 可在 Build Command 里直接写。
- 如果启用了 hCaptcha，确认 `HCAPTCHA_SECRET` 和 `NEXT_PUBLIC_HCAPTCHA_SITEKEY` 在 Vercel 的 **Production** 环境（不仅是 Preview / Development）都设置了，并且生产域名已在 hCaptcha 控制台的白名单中。

### 生产数据库连接（Supabase 连接池）

Vercel 等 Serverless 平台会为每个函数实例新建数据库连接，很容易击穿托管 PostgreSQL 的最大连接数（Supabase 免费版上限是 60）。解决方法是把运行时流量路由到 Supabase 内置的连接池（PgBouncer），迁移仍走直连。

如果部署后出现 `FATAL: too many connections` 错误，或者部署后应用根本无法连接数据库，请把 `DATABASE_URL` 替换为从项目页面获取的pooler连接串：

```env
DATABASE_URL="postgresql://postgres.[project]:[PASSWORD]@[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[project].supabase.co:5432/postgres"
```

说明：

- 把 `[project]` 替换为 Supabase 控制台 URL 中的项目名（例：如果 URL 是 `https://supabase.com/dashboard/project/abcdefghij`，则填 `abcdefghij`）。
- 把 `[PASSWORD]` 替换为创建项目时设置的数据库密码（**不是** Supabase 账户密码）。忘记可在 Supabase → Project Settings → Database → Database password 重置。
- 主机 `aws-1-ap-southeast-1.pooler.supabase.com` 是新加坡区域。如果项目位于其他区域，请换成对应的主机（例：美东区域为 `aws-0-us-east-1.pooler.supabase.com`）。完整列表在 Supabase → Project Settings → Database → Connection string → Transaction pooler。
- 查询串 `pgbouncer=true&connection_limit=1` 不可省略：它告诉 Prisma 使用事务模式，并将单个函数实例的并发连接数限制为 1。不加这个串，连接池在压力下仍可能被击穿。
- 池端口是 `6543`，直连端口是 `5432`，两者不可互换。

部署后如何验证池可达：

```bash
# 替换占位符后，在本地执行
psql "postgresql://postgres.[project]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres" -c "select 1"
```

返回 `1` 即表示连接池可达，部署后的应用也应能正常连接。

### Vercel 一次性配置

1. 推送到 GitHub，然后在 Vercel 中 Import 该仓库。
2. 在 Vercel 项目设置中，把上述所有变量添加到 Settings → Environment Variables。务必填生产值（Supabase 池 URL、生产 OAuth 凭据、生产 `AUTH_SECRET`）。
3. Build Command：`bun run db:generate && bun run build`（让 Prisma Client 在 Next.js 构建前生成）。如果不用 bun，使用 `prisma generate && next build`。
4. 首次部署后数据库还没有 schema。在本地执行一次迁移，让 Prisma 指向生产直连：
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[project].supabase.co:5432/postgres" \
   bun run db:migrate deploy
   ```
5. 在 Vercel 触发 Redeploy，让新的环境变量生效。


## 开发约定

- TypeScript 严格模式。
- 路径别名 `@/*` → `src/*`。
- Prisma 表名使用 snake_case，列名使用 `@@map` 显式映射。
- 所有写操作需经过 CSRF 与会话校验。
- Edge 与 Node 端代码严格分离；禁止在 `auth.config.ts` 中引入 Node 模块。

## 路线图

- 完善邮箱验证流程（`verification_tokens` 表已就位）。
- 2FA / TOTP 支持。
- 国际化（i18n）。
- 端到端测试（Playwright）。
- 在 OAuth 回调与密码重置流程中可选启用 hCaptcha。

## 许可

MIT License
