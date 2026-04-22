import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { match_id, user_id, vote } = await request.json();

  const THREE_MINUTES = 3 * 60 * 1000;
  const now = Date.now();

  // 1. Get existing vote for THIS match
  const { data: existing } = await supabaseAdmin
    .from("match_votes")
    .select("*")
    .eq("match_id", match_id)
    .eq("user_id", user_id)
    .maybeSingle();

  // 2. If exists → cooldown check
  if (existing?.updated_at) {
    const lastTime = new Date(existing.updated_at).getTime();

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

  // 3. UPSERT (this is the key fix)
  const { error } = await supabaseAdmin
    .from("match_votes")
    .upsert({
      match_id,
      user_id,
      vote,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "match_id,user_id",
    });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}