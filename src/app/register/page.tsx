import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header, DefaultLogo, type HeaderAction } from "@/components/Header";
import { headerIcons } from "@/components/header-icons";
import RegisterForm from "@/components/RegisterForm";
import { isHCaptchaEnabled, getHCaptchaSiteKey } from "@/lib/hcaptcha";

interface RegisterPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function RegisterPage(props: RegisterPageProps) {
  const session = await auth();
  const { error, callbackUrl } = await props.searchParams;

  if (session?.user) {
    redirect(callbackUrl || "/dashboard");
  }

  const errorMessages: Record<string, string> = {
    EMAIL_EXISTS: "A user with this email already exists.",
    WEAK_PASSWORD: "Password must be at least 8 characters.",
    MISSING_FIELDS: "Email and password are required.",
    INVALID_EMAIL: "Please enter a valid email address.",
    PASSWORD_WEAK: "Password must include uppercase, lowercase, and a number.",
    HCAPTCHA_FAILED: "hCaptcha verification failed. Please try again.",
    default: "Registration failed. Please try again.",
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.default : null;

  // hCaptcha 透传
  const hcaptchaEnabled = isHCaptchaEnabled();
  const hcaptchaSiteKey = hcaptchaEnabled ? getHCaptchaSiteKey() : "";

  const actions: HeaderAction[] = [
    {
      href: "/login",
      label: "Sign In",
      icon: headerIcons.signIn,
      title: "Sign In",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header logo={<DefaultLogo />} actions={actions} />

      {/* Register Content */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Register Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Create Account
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Get started with secure authentication
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Register Form (含 hCaptcha 校验) */}
            <RegisterForm
              callbackUrl={callbackUrl}
              hcaptchaSiteKey={hcaptchaSiteKey}
            />
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
              className="font-medium text-gray-900 hover:text-gray-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
