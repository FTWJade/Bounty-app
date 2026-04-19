import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  console.log("🔥 DAILY ROUTE HIT");

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user_id = session.user.id;
  const username = session.user.name ?? "unknown";
  const today = new Date().toISOString().split("T")[0];

  console.log("SESSION USER ID:", user_id);

  // 1️⃣ GET USER
  let { data: user, error: userError } = await supabaseAdmin
    .from("bounties")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();

  console.log("DB USER:", user, userError);

  // 2️⃣ AUTO CREATE USER IF MISSING
  if (!user) {
    console.log("🆕 Creating new user...");

    const { error: insertError } = await supabaseAdmin.from("bounties").insert({
      user_id,
      username,
      bounty: 0,
      points: 0,
      last_login: null,
    });

    if (insertError) {
      console.log("❌ USER CREATE ERROR:", insertError);
      return NextResponse.json({ error: "Failed to create user" });
    }

    // re-fetch user after creation
    const res = await supabaseAdmin
      .from("bounties")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    user = res.data;
  }

  let pointsAdded = 0;
  let unlocked: string[] = [];

  // 3️⃣ DAILY LOGIN
  if (user?.last_login !== today) {
    pointsAdded = 100;

    await supabaseAdmin
      .from("bounties")
      .update({
        points: (user.points || 0) + 100,
        last_login: today,
      })
      .eq("user_id", user_id);

    unlocked.push("daily_login");
  }

  // 4️⃣ ACHIEVEMENTS
  console.log("➡️ CHECKING ACHIEVEMENTS");

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("achievements")
    .select("user_id")
    .eq("user_id", user_id)
    .eq("achievement_id", "first_login")
    .maybeSingle();

  console.log("ACH CHECK:", { existing, fetchError });

  if (!existing) {
    const { error: insertError } = await supabaseAdmin
      .from("achievements")
      .insert({
        user_id,
        achievement_id: "first_login",
        unlocked_at: new Date().toISOString(),
      });

    console.log("ACH INSERT ERROR:", insertError);

    if (!insertError) {
      unlocked.push("first_login");
    }
  }

  return NextResponse.json({ pointsAdded, unlocked });
}