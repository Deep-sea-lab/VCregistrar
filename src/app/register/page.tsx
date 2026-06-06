import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header, DefaultLogo, type HeaderAction } from "@/components/Header";
import { headerIcons } from "@/components/header-icons";

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
    default: "Registration failed. Please try again.",
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.default : null;

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

            <form
              action={async (formData: FormData) => {
                "use server";
                const name = (formData.get("name") as string)?.trim();
                const email = (formData.get("email") as string)?.trim();
                const password = formData.get("password") as string;
                const confirmPassword = formData.get("confirmPassword") as string;

                if (!email || !password) {
                  redirect(
                    "/register?error=MISSING_FIELDS" +
                      (callbackUrl
                        ? `&callbackUrl=${encodeURIComponent(callbackUrl)}`
                        : "")
                  );
                }

                if (password.length < 8) {
                  redirect(
                    "/register?error=WEAK_PASSWORD" +
                      (callbackUrl
                        ? `&callbackUrl=${encodeURIComponent(callbackUrl)}`
                        : "")
                  );
                }

                if (password !== confirmPassword) {
                  redirect(
                    "/register?error=password_mismatch" +
                      (callbackUrl
                        ? `&callbackUrl=${encodeURIComponent(callbackUrl)}`
                        : "")
                  );
                }

                const res = await fetch(
                  `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/register`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password }),
                  }
                );

                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  const code = (data?.code as string) || "default";
                  redirect(
                    `/register?error=${code}` +
                      (callbackUrl
                        ? `&callbackUrl=${encodeURIComponent(callbackUrl)}`
                        : "")
                  );
                }

                const loginUrl = callbackUrl
                  ? `/login?success=${encodeURIComponent("Account created! Please sign in.")}&callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : `/login?success=${encodeURIComponent("Account created! Please sign in.")}`;
                redirect(loginUrl);
              }}
              className="space-y-4"
            >
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
              <button
                type="submit"
                className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 transition-colors"
              >
                Create Account
              </button>
            </form>
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
