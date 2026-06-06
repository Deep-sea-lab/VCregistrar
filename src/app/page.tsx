import { auth, signOut } from "@/auth";
import Link from "next/link";
import { Header, DefaultLogo, type NavItem, type HeaderAction } from "@/components/Header";
import { headerIcons } from "@/components/header-icons";

export default async function Home() {
  const session = await auth();

  const navLinks: NavItem[] = [
    {
      href: "#features",
      label: "Features",
      icon: headerIcons.features,
      title: "Features",
    },
    {
      href: "#code",
      label: "Quick Start",
      icon: headerIcons.quickStart,
      title: "Quick Start",
    },
  ];

  const actions: HeaderAction[] = session?.user
    ? [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: headerIcons.dashboard,
          variant: "primary",
          title: "Dashboard",
        },
        {
          formAction: async () => {
            "use server";
            await signOut();
          },
          label: "Sign Out",
          icon: headerIcons.signOut,
          title: "Sign Out",
        },
      ]
    : [
        {
          href: "/login",
          label: "Sign In",
          icon: headerIcons.signIn,
          title: "Sign In",
        },
        {
          href: "/register",
          label: "Get Started",
          icon: headerIcons.getStarted,
          variant: "primary",
          title: "Get Started",
        },
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header logo={<DefaultLogo />} navLinks={navLinks} actions={actions} />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-gray-200 opacity-50 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-gray-100 opacity-50 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Unified Authentication
              <span className="block text-gray-600">Made Simple</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              A centralized authentication system with support for OAuth providers,
              secure credential login, and JWT-based session management.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-green-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-600 transition-all"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="rounded-lg bg-green-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-600 transition-all"
                  >
                    Start Free
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 transition-all"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { label: "Authentication Methods", value: "3+" },
              { label: "Session Duration", value: "30d" },
              { label: "Security Features", value: "5" },
              { label: "API Endpoints", value: "10+" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Everything You Need
            </h2>
            <p className="mt-2 text-gray-600">
              Secure, scalable, and easy to integrate authentication.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "JWT Sessions",
                desc: "Stateless authentication using JSON Web Tokens for cross-platform verification and seamless API integration.",
                detail: "Token-based, no server storage needed"
              },
              {
                title: "OAuth 2.0",
                desc: "GitHub & Microsoft Entra ID third-party login integration with secure token handling.",
                detail: "Social login in minutes"
              },
              {
                title: "Rate Limiting",
                desc: "Edge-level rate limiting with Upstash Redis to prevent API abuse and ensure service stability.",
                detail: "Protected from brute force"
              },
              {
                title: "Audit Logging",
                desc: "Comprehensive logging of authentication events for security monitoring and compliance.",
                detail: "Full activity tracking"
              },
              {
                title: "PostgreSQL Storage",
                desc: "Reliable data persistence with Prisma ORM for type-safe database operations.",
                detail: "Production-ready database"
              },
              {
                title: "Next.js 15",
                desc: "Built on the latest Next.js with App Router for optimal performance and developer experience.",
                detail: "App Router architecture"
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="relative rounded-2xl border border-gray-200 bg-white p-6 hover:border-green-200 hover:shadow-sm transition-all"
              >
                <div className="h-1 w-8 rounded-full bg-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {feature.desc}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  {feature.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section id="code" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Quick Integration
              </h2>
              <p className="mt-4 text-gray-600">
                Get started with just a few environment variables. Our system handles
                the complexity of OAuth flows, token refresh, and session management.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="h-2 w-2 rounded-full bg-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Copy .env.example to .env</p>
                    <p className="text-xs text-gray-500 mt-0.5">Configure your database and Redis connection</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="h-2 w-2 rounded-full bg-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Set OAuth credentials</p>
                    <p className="text-xs text-gray-500 mt-0.5">Add GitHub and Microsoft Entra ID app credentials</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="h-2 w-2 rounded-full bg-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Deploy and use</p>
                    <p className="text-xs text-gray-500 mt-0.5">Your auth system is ready to use</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-900 p-6 overflow-x-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <pre className="text-sm text-gray-300">
                <code>{`# Environment Setup
DATABASE_URL="postgresql://..."
UPSTASH_REDIS_REST_URL="..."

# OAuth Providers
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-secret"

# Auth.js Secret
AUTH_SECRET="generate-with-openssl"
NEXTAUTH_URL="http://localhost:3000"`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Built for Production
            </h2>
            <p className="mt-2 text-gray-600">
              Everything you need out of the box.
            </p>
          </div>
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Included</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { name: "JWT Sessions", included: true, detail: "Stateless, secure token-based auth" },
                  { name: "OAuth Providers", included: true, detail: "GitHub & Microsoft Entra ID" },
                  { name: "Rate Limiting", included: true, detail: "Edge-level protection with Redis" },
                  { name: "Audit Logging", included: true, detail: "Track all auth events" },
                  { name: "CSRF Protection", included: true, detail: "Built-in security headers" },
                  { name: "Session Management", included: true, detail: "30-day sessions, automatic refresh" }
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100">
                        <span className="h-2 w-2 rounded-full bg-green-600" />
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              How It Works
            </h2>
            <p className="mt-2 text-gray-600">
              Get started with secure authentication in minutes.
            </p>
          </div>
          <div className="mt-16">
            <div className="grid gap-8 lg:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Create Account",
                  desc: "Register with your email or sign in with GitHub/Microsoft to get started instantly."
                },
                {
                  step: "02",
                  title: "Configure Providers",
                  desc: "Set up OAuth applications in your provider dashboard and add credentials to your environment."
                },
                {
                  step: "03",
                  title: "Integrate & Deploy",
                  desc: "Use our API endpoints or embed the login widget in your application for seamless authentication."
                }
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-bold text-green-200">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech" className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Built With Modern Tech
            </h2>
            <p className="mt-2 text-gray-600">
              Powered by industry-leading frameworks and services.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {[
              { name: "Next.js 15", desc: "React Framework" },
              { name: "Auth.js v5", desc: "Authentication" },
              { name: "PostgreSQL", desc: "Database" },
              { name: "Prisma", desc: "ORM" },
              { name: "Tailwind CSS", desc: "Styling" },
              { name: "Upstash Redis", desc: "Rate Limiting" }
            ].map((tech, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-3 shadow-sm"
              >
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-900">{tech.name}</span>
                <span className="text-sm text-gray-500">· {tech.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Create your account today and secure your applications with enterprise-grade authentication.
            </p>
            <div className="mt-8">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
                >
                  Create Free Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">VCregistrar</span>
            </div>
            <p className="text-sm text-gray-500">
              Centralized authentication system powered by Next.js and Auth.js
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
