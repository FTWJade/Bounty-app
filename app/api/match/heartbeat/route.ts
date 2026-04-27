import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { match_id, user_id } = await request.json();

  console.log("💓 HEARTBEAT:", { match_id, user_id });

  if (!match_id || !user_id) {
    return Response.json({ error: "Missing data" }, { status: 400 });
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

  // 2. fetch user vote
  const { data: voteData, error: voteError } = await supabaseAdmin
    .from("match_votes")
    .select("vote, updated_at")
    .eq("match_id", match_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (voteError) {
    return Response.json({ error: voteError.message }, { status: 500 });
  }

  // 3. compute cooldown
  let cooldown_end: number | null = null;

  if (voteData?.updated_at) {
    const last = new Date(voteData.updated_at).getTime();
    const diff = now - last;

    if (diff < THREE_MINUTES) {
      cooldown_end = last + THREE_MINUTES;
    }
  }

  return Response.json({
    success: true,
    vote: voteData?.vote ?? null,
    cooldown_end,
  });
}