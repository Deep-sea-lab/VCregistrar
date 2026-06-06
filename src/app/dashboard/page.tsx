import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getGravatarUrl, getGravatarAlt } from "@/lib/gravatar";
import {
  PasswordPanel,
  NamePanel,
  SignOutAllPanel,
} from "@/components/DashboardActions";
import { LinkProviderButton } from "@/components/LinkProviderButton";
import { Header, DefaultLogo, type HeaderAction } from "@/components/Header";
import { headerIcons } from "@/components/header-icons";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id as string;
  const email = (session.user.email as string | null) || null;
  const name = (session.user.name as string | null) || null;

  // Pull the real connected OAuth accounts from the database.
  const linkedAccounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      scope: true,
      expires_at: true,
    },
    orderBy: { provider: "asc" },
  });

  // Real user record for "has password" and member-since data.
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
      role: true,
    },
  });

  const hasPassword = !!userRecord?.passwordHash;
  const memberSince = userRecord?.createdAt;
  const lastUpdated = userRecord?.updatedAt;
  const hasGitHub = linkedAccounts.some((a) => a.provider === "github");
  const hasMicrosoft = linkedAccounts.some(
    (a) => a.provider === "microsoft-entra-id"
  );
  const hasEmailLogin = hasPassword;
  const totalSignInMethods =
    (hasEmailLogin ? 1 : 0) + (hasGitHub ? 1 : 0) + (hasMicrosoft ? 1 : 0);

  const avatarUrl = getGravatarUrl(email, 200, "identicon");
  const avatarAlt = getGravatarAlt(name, email);

  const displayName = name || (email ? email.split("@")[0] : "User");
  const gravatarEditUrl = email
    ? `https://en.gravatar.com/profile/${encodeURIComponent(
        email.toLowerCase()
      )}`
    : "https://en.gravatar.com/";

  const actions: HeaderAction[] = [
    {
      formAction: async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      },
      label: "Sign out",
      icon: headerIcons.signOut,
      title: "Sign out",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <Header
        logo={
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            title={email ?? "Dashboard"}
          >
            <span className="text-xl font-bold text-gray-900">VCregistrar</span>
          </Link>
        }
        actions={actions}
      >
        <span className="hidden text-xs text-gray-500 sm:inline">{email}</span>
      </Header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Gravatar avatar */}
              <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-gray-200">
                <Image
                  src={avatarUrl}
                  alt={avatarAlt}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                <p className="text-sm text-gray-500">{email}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Role:{" "}
                  <span className="font-medium text-gray-700">
                    {userRecord?.role || "USER"}
                  </span>
                  {memberSince && (
                    <>
                      {" "}
                      · Joined{" "}
                      <span className="font-medium text-gray-700">
                        {new Date(memberSince).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
              <p className="font-medium text-gray-700">Sign-in methods</p>
              <p className="mt-1">
                You currently have{" "}
                <span className="font-semibold text-gray-900">
                  {totalSignInMethods}
                </span>{" "}
                way{totalSignInMethods === 1 ? "" : "s"} to sign in.
              </p>
            </div>
          </div>
        </section>

        {/* Two-column layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Connected Providers — REAL data from the DB */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Connected Providers
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    These are the third-party sign-in methods currently linked to your account.
                  </p>
                </div>
              </div>

              <ul className="divide-y divide-gray-100">
                {/* Email / password */}
                <li className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 7l9 6 9-6" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Email & Password
                      </p>
                      <p className="text-xs text-gray-500">
                        {hasEmailLogin
                          ? email
                          : "No password set. Add one to enable email sign-in."}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      hasEmailLogin
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {hasEmailLogin ? "Connected" : "Not set"}
                  </span>
                </li>

                {/* GitHub */}
                <li className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white">
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">GitHub</p>
                        <p className="text-xs text-gray-500">
                          {hasGitHub
                            ? "Sign in with your GitHub account is enabled."
                            : "Link GitHub to enable one-click sign-in."}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        hasGitHub
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {hasGitHub ? "Connected" : "Not linked"}
                    </span>
                  </div>
                  {!hasGitHub && (
                    <div className="mt-3 pl-12">
                      <LinkProviderButton provider="github" />
                    </div>
                  )}
                </li>

                {/* Microsoft */}
                <li className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 23 23"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <rect x="1" y="1" width="9" height="9" />
                          <rect x="12" y="1" width="9" height="9" />
                          <rect x="1" y="12" width="9" height="9" />
                          <rect x="12" y="12" width="9" height="9" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Microsoft (Entra ID)
                        </p>
                        <p className="text-xs text-gray-500">
                          {hasMicrosoft
                            ? "Sign in with your Microsoft account is enabled."
                            : "Link Microsoft to enable one-click sign-in."}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        hasMicrosoft
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {hasMicrosoft ? "Connected" : "Not linked"}
                    </span>
                  </div>
                  {!hasMicrosoft && (
                    <div className="mt-3 pl-12">
                      <LinkProviderButton provider="microsoft-entra-id" />
                    </div>
                  )}
                </li>
              </ul>
            </section>

            {/* Account Settings  */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Account Settings
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Manage your sign-in credentials and active sessions.
                </p>
              </div>
              <div className="space-y-4">
                <NamePanel initialName={displayName} />
                <PasswordPanel hasPassword={hasPassword} />
                <SignOutAllPanel />
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Avatar / Gravatar guide */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">
                Profile Picture
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Your avatar is loaded from{" "}
                <a
                  href="https://gravatar.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
                >
                  Gravatar
                </a>{" "}
                using the email on your account.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-gray-200">
                  <Image
                    src={avatarUrl}
                    alt={avatarAlt}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="text-xs text-gray-600">
                  <p className="font-medium text-gray-700">{email}</p>
                  <p className="text-gray-500">
                    Linked to your Gravatar account.
                  </p>
                </div>
              </div>

              <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-gray-600">
                <li>
                  Open{" "}
                  <a
                    href={gravatarEditUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
                  >
                    gravatar.com
                  </a>{" "}
                  and sign in with the same email.
                </li>
                <li>Upload a new image and crop it.</li>
                <li>
                  Come back to this page — the new avatar appears automatically.
                </li>
              </ol>

              <a
                href={gravatarEditUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Update avatar on Gravatar ↗
              </a>
            </section>

            {/* Account snapshot */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">
                Account Snapshot
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Important information about your account.
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="truncate text-right font-medium text-gray-900">
                    {email}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Role</dt>
                  <dd className="font-medium text-gray-900">
                    {userRecord?.role || "USER"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Sign-in methods</dt>
                  <dd className="font-medium text-gray-900">
                    {totalSignInMethods}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Member since</dt>
                  <dd className="font-medium text-gray-900">
                    {memberSince
                      ? new Date(memberSince).toLocaleDateString()
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Profile last updated</dt>
                  <dd className="font-medium text-gray-900">
                    {lastUpdated ? new Date(lastUpdated).toLocaleString() : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
