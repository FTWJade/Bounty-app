import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";


export async function POST(req: NextRequest) {
  const { user_id, username, bounty } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  let { data: user } = await supabaseAdmin
    .from("bounties")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();

  if (!user) {
    await supabaseAdmin.from("bounties").insert({
      user_id,
      username,
      bounty: bounty || 0,
      points: 100,
      last_login: today,
    });
  } else {
    const updates: any = {};

    if (bounty !== undefined) updates.bounty = bounty;

    if (user.last_login !== today) {
      updates.points = (user.points || 0) + 100;
      updates.last_login = today;
    }

    await supabaseAdmin
      .from("bounties")
      .update(updates)
      .eq("user_id", user_id);
  }

  return NextResponse.json({ ok: true });
}

// 🔹 LOAD bounty
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");

  const { data, error } = await supabaseAdmin
    .from("bounties")
    .select("bounty, points")
    .eq("user_id", user_id)
    .maybeSingle();

  return NextResponse.json({ data, error });
}