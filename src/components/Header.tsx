import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * 导航项定义。
 * - 仅提供 `label`：始终显示文字。
 * - 仅提供 `icon`：始终只显示图标。
 * - 同时提供 `icon` 与 `label`：宽度 >= sm 时显示文字，宽度较小时仅显示图标。
 */
export type NavItem = {
  href: string;
  label?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "ghost";
  /** 鼠标悬浮提示（可选；没有 label 时建议提供） */
  title?: string;
};

export type HeaderAction = {
  /** 图标节点（内联 SVG）。无 label 时必填。 */
  icon: React.ReactNode;
  /** 大宽度下的文字（可选；不提供则始终只显示图标） */
  label?: string;
  /** 链接地址（与 formAction 互斥） */
  href?: string;
  /** 服务端 action（与 href 互斥，用于 signOut 等） */
  formAction?: () => Promise<void>;
  /** primary = 实心按钮，ghost = 透明背景 */
  variant?: "primary" | "ghost";
  /** 鼠标悬浮提示（无文字时建议提供） */
  title?: string;
};

export type HeaderProps = {
  /** Logo 区域：通常是一个返回首页的链接 */
  logo: React.ReactNode;
  /** 导航链接（纯链接，宽度较小时可变成图标） */
  navLinks?: NavItem[];
  /** 主要操作按钮（带 signOut 表单 / 不同样式时使用） */
  actions?: HeaderAction[];
  /** 是否显示主题切换按钮，默认 true */
  showThemeToggle?: boolean;
  /** 额外的右侧内容（例如 dashboard 中显示的邮箱）。会插入到 actions 之前。 */
  extras?: React.ReactNode;
  /** 兼容 children 用法（等价于 extras）。 */
  children?: React.ReactNode;
};

/**
 * 通用 Header 组件：
 * - 宽度足够（>= sm）时，按钮显示完整文字；
 * - 宽度较小时，自动只显示图标。
 *
 * 图标通过 props 传入（内联 SVG），组件本身不依赖任何静态资源路径。
 */
export function Header({
  logo,
  navLinks = [],
  actions = [],
  showThemeToggle = true,
  extras,
  children,
}: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">{logo}</div>

          {/* Navigation */}
          <nav className="flex items-center gap-3 sm:gap-6">
            {navLinks.map((item, idx) => (
              <HeaderLink key={`${item.href}-${idx}`} item={item} />
            ))}

            {extras}
            {children}

            {actions.map((action, idx) => (
              <HeaderActionButton key={idx} action={action} />
            ))}

            {showThemeToggle && <ThemeToggle />}
          </nav>
        </div>
      </div>
    </header>
  );
}

/** 默认 logo：站点名 + 链接回首页 */
export function DefaultLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="text-xl font-bold text-gray-900">VCregistrar</span>
    </Link>
  );
}

function HeaderLink({ item }: { item: NavItem }) {
  const hasLabel = !!item.label;
  const hasIcon = !!item.icon;

  // 1) 纯文字
  if (hasLabel && !hasIcon) {
    return (
      <Link
        href={item.href}
        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        {item.label}
      </Link>
    );
  }

  // 2) 纯图标
  if (hasIcon && !hasLabel) {
    return (
      <Link
        href={item.href}
        title={item.title}
        className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <span className="block h-5 w-5">{item.icon}</span>
      </Link>
    );
  }

  // 3) 图标 + 文字：宽度小时只显示图标
  if (hasIcon && hasLabel) {
    const isPrimary = item.variant === "primary";
    const variantClasses = isPrimary
      ? "rounded-lg bg-green-700 text-white hover:bg-green-600 p-2 sm:px-4 sm:py-2"
      : "text-gray-600 hover:text-gray-900 p-2 sm:p-0";

    return (
      <Link
        href={item.href}
        title={item.title}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${variantClasses}`}
      >
        <span className="block h-5 w-5 sm:hidden">{item.icon}</span>
        <span className="hidden sm:inline">{item.label}</span>
      </Link>
    );
  }

  return null;
}

function HeaderActionButton({ action }: { action: HeaderAction }) {
  const variant = action.variant ?? "ghost";
  const hasLabel = !!action.label;

  const primaryBase =
    "rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors";
  const ghostBase =
    "text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors";

  const iconSize = "h-5 w-5";

  // 链接形式的按钮
  if (action.href) {
    if (hasLabel) {
      return (
        <Link
          href={action.href}
          title={action.title}
          className={`inline-flex items-center justify-center text-sm font-medium ${
            variant === "primary"
              ? `${primaryBase} p-2 sm:px-4 sm:py-2`
              : `${ghostBase} p-2 sm:p-0`
          }`}
        >
          <span className={`${iconSize} sm:hidden`}>{action.icon}</span>
          <span className="hidden sm:inline">{action.label}</span>
        </Link>
      );
    }
    return (
      <Link
        href={action.href}
        title={action.title}
        className={`inline-flex items-center justify-center p-2 rounded-lg ${
          variant === "primary" ? primaryBase : ghostBase
        }`}
      >
        <span className={`${iconSize} block`}>{action.icon}</span>
      </Link>
    );
  }

  // 表单形式的按钮（如 signOut）
  if (action.formAction) {
    if (hasLabel) {
      return (
        <form action={action.formAction}>
          <button
            type="submit"
            title={action.title}
            className={`inline-flex items-center justify-center text-sm font-medium ${
              variant === "primary"
                ? `${primaryBase} p-2 sm:px-4 sm:py-2`
                : `${ghostBase} p-2 sm:p-0`
            }`}
          >
            <span className={`${iconSize} sm:hidden`}>{action.icon}</span>
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        </form>
      );
    }
    return (
      <form action={action.formAction}>
        <button
          type="submit"
          title={action.title}
          className={`inline-flex items-center justify-center p-2 rounded-lg ${
            variant === "primary" ? primaryBase : ghostBase
          }`}
        >
          <span className={`${iconSize} block`}>{action.icon}</span>
        </button>
      </form>
    );
  }

  return null;
}
