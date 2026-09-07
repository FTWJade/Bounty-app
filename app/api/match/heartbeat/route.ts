import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { match_id, user_id } = await request.json();

  if (!user_id) {
    return Response.json({ error: "Missing user_id" }, { status: 400 });
  }
  // Startup check: find an active match where this user is a contestant
  if (!match_id) {
    const { data: activeMatch, error: activeMatchError } =
      await supabaseAdmin
        .from("matches")
        .select("*")
        .or(`creator_id.eq.${user_id},opponent_id.eq.${user_id}`)
        .in("status", ["open", "active", "lobby", "waiting"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (activeMatchError) {
      return Response.json(
        { error: activeMatchError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      match: activeMatch ?? null,
      vote: null,
      cooldown_end: null,
    });
  }
  const now = Date.now();
  const THREE_MINUTES = 3 * 60 * 1000;

  // 1. update match activity
  const { error: updateError } = await supabaseAdmin
    .from("matches")
    .update({
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", match_id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const nowISO = new Date().toISOString();

  // fetch match so we know roles
  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("creator_id, opponent_id")
    .eq("id", match_id)
    .single();

  if (!match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  const updates: any = {
    last_activity_at: nowISO, // keep if you want
  };

  if (user_id === match.creator_id) {
    updates.creator_last_seen = nowISO;
  }

  if (user_id === match.opponent_id) {
    updates.opponent_last_seen = nowISO;
  }

  await supabaseAdmin
    .from("matches")
    .update(updates)
    .eq("id", match_id);

  // 2. fetch the user's website vote
  const { data: voteData, error: voteError } = await supabaseAdmin
    .from("match_votes")
    .select("vote, updated_at")
    .eq("match_id", match_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (voteError) {
    return Response.json({ error: voteError.message }, { status: 500 });
  }

  // A linked Twitch vote is the same user's vote, so include it when the
  // website vote has not adopted it yet.
  let twitchVoteData: { vote: "A" | "B"; updated_at: string | null } | null = null;

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

  if (twitchConnection?.twitch_id) {
    const { data: twitchVote, error: twitchVoteError } = await supabaseAdmin
      .from("twitch_votes")
      .select("vote, updated_at")
      .eq("match_id", match_id)
      .eq("twitch_user_id", twitchConnection.twitch_id)
      .maybeSingle();

    if (twitchVoteError) {
      return Response.json(
        { error: twitchVoteError.message },
        { status: 500 }
      );
    }

    twitchVoteData = twitchVote;
  }

  // 3. compute cooldown from whichever platform has the newest vote
  const websiteVoteTime = (() => {
    if (!voteData?.updated_at) return null;
    const time = new Date(voteData.updated_at).getTime();
    return Number.isFinite(time) && time <= now ? time : null;
  })();

  const twitchVoteTime = (() => {
    if (!twitchVoteData?.updated_at) return null;
    const time = new Date(twitchVoteData.updated_at).getTime();
    return Number.isFinite(time) && time <= now ? time : null;
  })();

  const latestVoteTime = Math.max(
    websiteVoteTime ?? 0,
    twitchVoteTime ?? 0
  );

  let cooldown_end: number | null = null;

  if (latestVoteTime > 0) {
    const cooldownEnd = latestVoteTime + THREE_MINUTES;

    if (now < cooldownEnd) {
      cooldown_end = cooldownEnd;
    }
  }

  const websiteVote = voteData?.vote ?? null;
  const twitchVote = twitchVoteData?.vote ?? null;
  const currentVote =
    twitchVoteTime !== null &&
    (websiteVoteTime === null || twitchVoteTime >= websiteVoteTime)
      ? twitchVote
      : websiteVote;

  return Response.json({
    success: true,
    vote: currentVote,
    cooldown_end,
  });
}