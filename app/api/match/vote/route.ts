import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const { match_id, user_id, vote } = body;

  const THREE_MINUTES = 3 * 60 * 1000;
  const now = Date.now();

  // 1. Get last vote
  const { data: lastVote } = await supabaseAdmin
    .from("match_votes")
    .select("created_at")
    .eq("match_id", match_id)
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Cooldown check
  if (lastVote) {
    const lastTime = new Date(lastVote.created_at).getTime();

    if (now - lastTime < THREE_MINUTES) {
      return Response.json(
        {
          error: "Cooldown active",
          remaining: Math.ceil((THREE_MINUTES - (now - lastTime)) / 1000),
        },
        { status: 429 }
      );
    }
  }

  // 3. ALWAYS insert new vote (no update logic)
  await supabaseAdmin.from("match_votes").insert({
    match_id,
    user_id,
    vote,
    created_at: new Date().toISOString(),
  });

  return Response.json({ success: true });
}