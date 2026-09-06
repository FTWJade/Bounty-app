import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { match_id, user_id, vote } = await request.json();

  const THREE_MINUTES = 3 * 60 * 1000;
  const now = Date.now();

  // 1. existing website vote
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("match_votes")
    .select("updated_at")
    .eq("match_id", String(match_id))
    .eq("user_id", String(user_id))
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  // 2. Check the user's linked Twitch vote too, so a vote made through Twitch
  // cannot immediately be followed by another vote on the website.
  const { data: twitchConnection, error: twitchConnectionError } =
    await supabaseAdmin
      .from("twitch_connections")
      .select("twitch_id")
      .eq("user_id", String(user_id))
      .maybeSingle();

  if (twitchConnectionError) {
    return Response.json(
      { error: twitchConnectionError.message },
      { status: 500 }
    );
  }

  let existingTwitchVote: { updated_at: string | null } | null = null;

  if (twitchConnection?.twitch_id) {
    const { data: twitchVote, error: twitchVoteError } = await supabaseAdmin
      .from("twitch_votes")
      .select("updated_at")
      .eq("match_id", String(match_id))
      .eq("twitch_user_id", twitchConnection.twitch_id)
      .maybeSingle();

    if (twitchVoteError) {
      return Response.json(
        { error: twitchVoteError.message },
        { status: 500 }
      );
    }

    existingTwitchVote = twitchVote;
  }

  // 3. cooldown — use whichever platform has the newest valid vote timestamp.
  const websiteVoteTime = (() => {
    if (!existing?.updated_at) return null;
    const time = new Date(existing.updated_at).getTime();
    return Number.isFinite(time) && time <= now ? time : null;
  })();

  const twitchVoteTime = (() => {
    if (!existingTwitchVote?.updated_at) return null;
    const time = new Date(existingTwitchVote.updated_at).getTime();
    return Number.isFinite(time) && time <= now ? time : null;
  })();

  const latestVoteTime = Math.max(
    websiteVoteTime ?? 0,
    twitchVoteTime ?? 0
  );

  if (latestVoteTime > 0) {
    const cooldownEnd = latestVoteTime + THREE_MINUTES;

    if (now < cooldownEnd) {
      return Response.json(
        {
          error: "Cooldown active",
          cooldown_end: cooldownEnd,
        },
        { status: 429 }
      );
    }
  }

  // 4. user check
  const { data: user } = await supabaseAdmin
    .from("bounties")
    .select("bounty")
    .eq("user_id", user_id)
    .single();

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // 5. Match fetch — bet_amount is the fixed vote cost for this match.
  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("bet_amount, bounty_pool")
    .eq("id", match_id)
    .single();

  if (!match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  // Fall back to bounty_pool for older matches created before bet_amount existed.
  const BET_COST = Number(match.bet_amount ?? match.bounty_pool ?? 0);

  if (BET_COST <= 0) {
    return Response.json({ error: "Invalid match bet amount" }, { status: 400 });
  }

  if (user.bounty < BET_COST) {
    return Response.json(
      { error: "Not enough bounty to vote" },
      { status: 400 }
    );
  }

  // 6. only charge on FIRST vote
  if (!existing) {
    const { error: deductError } = await supabaseAdmin
      .from("bounties")
      .update({
        bounty: user.bounty - BET_COST,
      })
      .eq("user_id", user_id)
      .gte("bounty", BET_COST);

    if (deductError) {
      return Response.json(
        { error: "Failed to deduct bounty" },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("matches")
      .update({
        bounty_pool: (match.bounty_pool || 0) + BET_COST,
      })
      .eq("id", match_id);
  }

  // 7. upsert vote
  const { error } = await supabaseAdmin
    .from("match_votes")
    .upsert(
      {
        match_id: String(match_id),
        user_id: String(user_id),
        vote,
        updated_at: new Date().toISOString(),
        bet_amount: BET_COST,
      },
      { onConflict: "match_id,user_id" }
    );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
