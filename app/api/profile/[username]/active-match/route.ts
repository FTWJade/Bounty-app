import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Find the user by username
  const { data: user, error: userError } = await supabaseAdmin
    .from("bounties")
    .select("user_id, username")
    .eq("username", username)
    .maybeSingle();

  if (userError) {
    console.error("ACTIVE MATCH USER ERROR:", userError);

    return NextResponse.json(
      { error: "Failed to find user" },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Find their active match
  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("*")
    .or(`creator_id.eq.${user.user_id},opponent_id.eq.${user.user_id}`)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (matchError) {
    console.error("ACTIVE MATCH ERROR:", matchError);

    return NextResponse.json(
      {
        error: "Failed to find active match",
        details: matchError.message,
        code: matchError.code,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    match: match ?? null,
  });
}