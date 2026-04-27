import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { match_id, user_id, vote } = await request.json();

  const THREE_MINUTES = 3 * 60 * 1000;
  const now = Date.now();

  // 1. existing vote
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("match_votes")
    .select("updated_at")
    .eq("match_id", String(match_id))
    .eq("user_id", String(user_id))
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  // 2. cooldown
  if (existing?.updated_at) {
    const lastTime = new Date(existing.updated_at).getTime();

    if (now - lastTime < THREE_MINUTES) {
      return Response.json(
        {
          error: "Cooldown active",
          cooldown_end: lastTime + THREE_MINUTES,
        },
        { status: 429 }
      );
    }
  }

  const BET_COST = 10;

  // 3. user check
  const { data: user } = await supabaseAdmin
    .from("bounties")

    .select("bounty")
    .eq("id", user_id)
    .single();

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (user.bounty < BET_COST) {
    return Response.json(
      { error: "Not enough bounty to vote" },
      { status: 400 }
    );
  }

  // 4. ALWAYS safe match fetch
  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("bounty_pool")
    .eq("id", match_id)
    .single();

  if (!match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  // 5. only charge on FIRST vote
  if (!existing) {
    await supabaseAdmin
      .from("bounties")

      .update({
        bounty: user.bounty - BET_COST,
      })
      .eq("id", user_id);

    await supabaseAdmin
      .from("matches")
      .update({
        bounty_pool: (match.bounty_pool || 0) + BET_COST,
      })
      .eq("id", match_id);
  }

  // 6. upsert vote
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