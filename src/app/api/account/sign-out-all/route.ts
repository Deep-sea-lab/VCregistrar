import { NextResponse } from "next/server";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    try {
      const { success } = await rateLimit(`signout-all:${userId}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many attempts. Please try again later." },
          { status: 429 }
        );
      }
    } catch {
      // ignore
    }

    // Delete all DB sessions for this user.
    try {
      await prisma.session.deleteMany({ where: { userId } });
    } catch {
      // ignore
    }

    // Sign out the current session (clears the cookie).
    await signOut({ redirect: false });

    return NextResponse.json({
      success: true,
      message: "Signed out of all devices",
    });
  } catch (err) {
    console.error("sign-out-all error:", err);
    return NextResponse.json(
      { error: "Failed to sign out of all devices" },
      { status: 500 }
    );
  }
}
