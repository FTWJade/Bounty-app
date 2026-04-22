import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { match_id, user_id, vote } = await request.json();

  const THREE_MINUTES = 3 * 60 * 1000;
  const now = Date.now();

  // 1. Get existing vote
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("match_votes")
    .select("updated_at, vote")
    .eq("match_id", String(match_id))
    .eq("user_id", String(user_id))
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  // 2. Cooldown check
  if (existing?.updated_at) {
    const lastTime = new Date(existing.updated_at).getTime();
    const diff = now - lastTime;

    if (diff < THREE_MINUTES) {
      return Response.json(
        {
          error: "Cooldown active",
          remaining: Math.ceil((THREE_MINUTES - diff) / 1000),
        },
        { status: 429 }
      );
    }
  }

  // 3. UPSERT vote
  const { error } = await supabaseAdmin
    .from("match_votes")
    .upsert(
      {
        match_id: String(match_id),
        user_id: String(user_id),
        vote,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "match_id,user_id",
      }
    );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}