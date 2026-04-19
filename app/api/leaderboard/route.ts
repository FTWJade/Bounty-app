import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("bounties")
    .select("user_id, username, points, bounty")
    .order("points", { ascending: false })
    .limit(10);

  return NextResponse.json({ data, error });
}