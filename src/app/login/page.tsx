import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header, DefaultLogo, type HeaderAction } from "@/components/Header";
import { headerIcons } from "@/components/header-icons";
import LoginForm from "@/components/LoginForm";
import { isHCaptchaEnabled, getHCaptchaSiteKey } from "@/lib/hcaptcha";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; success?: string; callbackUrl?: string }>;
}

export default async function LoginPage(props: LoginPageProps) {
  const session = await auth();
  const { error, success, callbackUrl } = await props.searchParams;

  const defaultRedirect = callbackUrl || "/dashboard";

  if (session?.user) {
    redirect(defaultRedirect);
  }

  const errorMessages: Record<string, string> = {
    CredentialsSignin: "Invalid email or password. Please try again.",
    OAuthAccountNotLinked: "This email is already linked to another account.",
    OAuthSignin: "Could not sign in with the selected provider.",
    OAuthCallback: "Could not complete the sign-in process.",
    HCAPTCHA_FAILED: "hCaptcha verification failed. Please try again.",
    default: "An unexpected error occurred. Please try again.",
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.default : null;

  // 服务端读取 hCaptcha 开关与 sitekey(透传给客户端组件,让组件决定是否渲染 widget)
  const hcaptchaEnabled = isHCaptchaEnabled();
  const hcaptchaSiteKey = hcaptchaEnabled ? getHCaptchaSiteKey() : "";

  const actions: HeaderAction[] = [
    {
      href: "/register",
      label: "Create Account",
      icon: headerIcons.getStarted,
      title: "Create Account",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header logo={<DefaultLogo />} actions={actions} />

      {/* Login Content */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Welcome Back
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to access your dashboard
              </p>
            </div>

            {success && (
              <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {success}
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: defaultRedirect });
                }}
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </button>
              </form>

              <form
                action={async () => {
                  "use server";
                  await signIn("microsoft-entra-id", { redirectTo: defaultRedirect });
                }}
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 23 23" fill="currentColor">
                    <rect x="1" y="1" width="9" height="9" />
                    <rect x="12" y="1" width="9" height="9" />
                    <rect x="1" y="12" width="9" height="9" />
                    <rect x="12" y="12" width="9" height="9" />
                  </svg>
                  Continue with Microsoft
                </button>
              </form>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Credentials Form (含 hCaptcha 校验) */}
            <LoginForm
              callbackUrl={defaultRedirect}
              hcaptchaSiteKey={hcaptchaSiteKey}
            />
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              href={callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}
              className="font-medium text-gray-900 hover:text-gray-700 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
