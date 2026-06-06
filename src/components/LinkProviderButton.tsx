"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type ProviderInfo = {
  id: "github" | "microsoft-entra-id";
  name: string;
  description: string;
  icon: React.ReactNode;
};

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 23 23" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" />
      <rect x="12" y="1" width="9" height="9" />
      <rect x="1" y="12" width="9" height="9" />
      <rect x="12" y="12" width="9" height="9" />
    </svg>
  );
}

const ALL_PROVIDERS: ProviderInfo[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Sign in with your GitHub account.",
    icon: <GitHubIcon />,
  },
  {
    id: "microsoft-entra-id",
    name: "Microsoft",
    description: "Sign in with your Microsoft / Entra ID account.",
    icon: <MicrosoftIcon />,
  },
];

export function LinkProviderButton({
  provider,
  callbackUrl = "/dashboard",
}: {
  provider: ProviderInfo["id"];
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function link() {
    setError(null);
    startTransition(async () => {
      try {
        // signIn() will start the OAuth flow. Auth.js is configured to refuse
        // unverified auto-linking of pre-existing email accounts, so this
        // effectively only links when the provider is genuinely new to the
        // user. We don't redirect away so the user can confirm the result.
        const result = await signIn(provider, {
          redirect: false,
          callbackUrl,
        });
        if (result?.error) {
          setError(
            result.error === "OAuthAccountNotLinked"
              ? "This provider is already linked to another account, or its email is already used."
              : "Could not start linking. Please try again."
          );
          return;
        }
        if (result?.url) {
          // Redirect into the OAuth provider
          window.location.href = result.url;
          return;
        }
        // Fallback: refresh current page to reflect any DB change
        router.refresh();
      } catch {
        setError("Unexpected error. Please try again.");
      }
    });
  }

  const info = ALL_PROVIDERS.find((p) => p.id === provider)!;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={link}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        <span className="text-white">{info.icon}</span>
        {isPending ? "Redirecting…" : `Link ${info.name}`}
      </button>
      {error && (
        <p className="text-[11px] text-red-600">{error}</p>
      )}
    </div>
  );
}
