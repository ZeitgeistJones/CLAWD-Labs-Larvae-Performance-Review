import { NextRequest, NextResponse } from "next/server";
import { initDb, setManualStatus, setRepoOverride } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { ideaId, manualStatus, repoOverride } = await request.json();

    if (!ideaId) {
      return NextResponse.json({ error: "ideaId required" }, { status: 400 });
    }

    if (manualStatus) {
      await setManualStatus(ideaId, manualStatus);
    }

    if (repoOverride !== undefined) {
      await setRepoOverride(ideaId, repoOverride);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
