import { NextRequest, NextResponse } from "next/server";
import { initDb, setManualStatus } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { ideaId, manualStatus } = await request.json();
    if (!ideaId || !manualStatus) {
      return NextResponse.json({ error: "ideaId and manualStatus required" }, { status: 400 });
    }
    await setManualStatus(ideaId, manualStatus);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
