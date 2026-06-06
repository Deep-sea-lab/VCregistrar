import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const NAME_REGEX = /^[\p{L}\p{N} _.\-']{1,50}$/u;

export async function POST(request: Request) {
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
      const { success } = await rateLimit(`change-name:${userId}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many attempts. Please try again later." },
          { status: 429 }
        );
      }
    } catch {
      // ignore
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const newName = String(body.name || "").trim();

    if (!newName) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (!NAME_REGEX.test(newName)) {
      return NextResponse.json(
        { error: "Name contains invalid characters or is too long (max 50)" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: newName },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error("change-name error:", err);
    return NextResponse.json(
      { error: "Failed to update name" },
      { status: 500 }
    );
  }
}
