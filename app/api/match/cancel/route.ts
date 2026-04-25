import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { match_id, user_id } = body;

    if (!match_id || !user_id) {
      return NextResponse.json(
        { error: "Missing match_id or user_id" },
        { status: 400 }
      );
    }

    // 1. Get match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    // 2. Only creator can cancel
    if (match.creator_id !== user_id) {
      return NextResponse.json(
        { error: "Only creator can cancel match" },
        { status: 403 }
      );
    }

    // 3. Block cancel if opponent already joined
    if (match.opponent_id) {
      return NextResponse.json(
        { error: "Cannot cancel — opponent already joined" },
        { status: 400 }
      );
    }

    // 4. Only allow cancel if still open/lobby/waiting
    if (!["open", "lobby", "waiting"].includes(match.status)) {
      return NextResponse.json(
        { error: "Match cannot be cancelled in current state" },
        { status: 400 }
      );
    }

    // 5. Cancel match
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        status: "cancelled",
      })
      .eq("id", match_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to cancel match" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Match cancelled",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}