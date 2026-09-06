import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    const { data: match, error: matchError } = await supabaseAdmin
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

    // 5. Refund website voters using each vote's stored bet amount.
    const { data: votes, error: votesError } = await supabaseAdmin
      .from("match_votes")
      .select("user_id, bet_amount")
      .eq("match_id", match_id);

    if (votesError) {
      return NextResponse.json(
        { error: "Failed to load votes for refund" },
        { status: 500 }
      );
    }

    const refundedWebsiteUsers = new Set<string>();

    for (const vote of votes || []) {
      if (!vote.user_id || refundedWebsiteUsers.has(vote.user_id)) continue;

      const amount = Number(vote.bet_amount ?? 0);
      if (amount <= 0) continue;

      await supabaseAdmin.rpc("add_points", {
        user_id_input: vote.user_id,
        amount_input: amount,
      });

      refundedWebsiteUsers.add(vote.user_id);
    }

    // 6. Refund paid Twitch votes to their linked bounty.town accounts.
    // Free/anonymous Twitch votes have bet_amount = 0, so they receive no bounty refund.
    const { data: twitchVotes, error: twitchVotesError } = await supabaseAdmin
      .from("twitch_votes")
      .select("bounty_user_id, bet_amount")
      .eq("match_id", match_id)
      .not("bounty_user_id", "is", null)
      .gt("bet_amount", 0);

    if (twitchVotesError) {
      return NextResponse.json(
        { error: "Failed to load Twitch votes for refund" },
        { status: 500 }
      );
    }

    for (const twitchVote of twitchVotes || []) {
      if (!twitchVote.bounty_user_id) continue;

      const amount = Number(twitchVote.bet_amount ?? 0);
      if (amount <= 0) continue;

      await supabaseAdmin.rpc("add_points", {
        user_id_input: twitchVote.bounty_user_id,
        amount_input: amount,
      });
    }

    // 7. Refund creator's match bet.
    if (match.creator_id) {
      await supabaseAdmin.rpc("add_points", {
        user_id_input: match.creator_id,
        amount_input: match.bet_amount ?? 0,
      });
    }

    // 8. Cancel match.
    const { error: updateError } = await supabaseAdmin
      .from("matches")
      .update({
        status: "cancelled",
        winner_id: null,
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
      message: "Match cancelled and refunds issued",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}