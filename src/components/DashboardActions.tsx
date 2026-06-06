"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Message = { type: "ok" | "err"; text: string } | null;

export function PasswordPanel({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMsg(null);
    if (newPassword.length < 8) {
      setMsg({ type: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirm) {
      setMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/account/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMsg({ type: "err", text: data?.error || "Failed to update password." });
          return;
        }
        setMsg({ type: "ok", text: "Password updated. You will be signed out shortly." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
        // refresh server data (name, etc.)
        router.refresh();
      } catch (e) {
        setMsg({ type: "err", text: "Network error. Please try again." });
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
          <p className="mt-1 text-xs text-gray-500">
            {hasPassword
              ? "Update the password used to sign in with email."
              : "Set a password so you can also sign in with email."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {open ? "Cancel" : hasPassword ? "Change" : "Set password"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {hasPassword && (
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="Enter current password"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              placeholder="Repeat new password"
            />
          </div>

          {msg && (
            <div
              className={`rounded-lg border p-2.5 text-xs ${
                msg.type === "ok"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={isPending || !newPassword}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : "Save password"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function NamePanel({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    if (!name.trim()) {
      setMsg({ type: "err", text: "Name cannot be empty." });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/account/change-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMsg({ type: "err", text: data?.error || "Failed to update name." });
          return;
        }
        setMsg({ type: "ok", text: "Display name updated." });
        router.refresh();
      } catch {
        setMsg({ type: "err", text: "Network error. Please try again." });
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">Display Name</h3>
      <p className="mt-1 text-xs text-gray-500">
        This name is shown across the app instead of your email.
      </p>
      <div className="mt-4 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          placeholder="Your display name"
        />
        {msg && (
          <div
            className={`rounded-lg border p-2.5 text-xs ${
              msg.type === "ok"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={isPending || name.trim() === initialName}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save name"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignOutAllPanel() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  function doSignOut() {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/account/sign-out-all", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setMsg({ type: "err", text: data?.error || "Failed to sign out of all devices." });
          return;
        }
        // Redirect to login. The current cookie is already cleared server-side.
        router.push("/login?success=Signed+out+of+all+devices");
        router.refresh();
      } catch {
        setMsg({ type: "err", text: "Network error. Please try again." });
      }
    });
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
      <h3 className="text-sm font-semibold text-gray-900">Sign out of all devices</h3>
      <p className="mt-1 text-xs text-gray-600">
        Immediately end every active session for your account. You will need to sign in again here.
      </p>
      <div className="mt-4">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            Sign out everywhere
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-red-700">
              Are you sure? This will end all of your active sessions.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={doSignOut}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Signing out…" : "Yes, sign out everywhere"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setMsg(null);
                }}
                disabled={isPending}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            {msg && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {msg.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
