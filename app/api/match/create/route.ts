import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();
  const { user_id, mode, bet_amount } = body;

  if (!user_id) {
    return new Response("Missing user_id", { status: 400 });
  }

  if (!bet_amount || bet_amount <= 0) {
    return new Response("Invalid bet_amount", { status: 400 });
  }

  // 1. Get user
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("bounty")
    .eq("id", user_id)
    .single();

  if (userError || !user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (user.bounty < bet_amount) {
    return Response.json({ error: "Not enough bounty" }, { status: 400 });
  }

  // 2. Create match FIRST (safe)
  const matchId = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .insert({
      id: matchId,
      creator_id: user_id,
      opponent_id: null,
      status: "open",
      mode: mode || "pvp",
      last_activity_at: new Date().toISOString(),
      bounty_pool: bet_amount,
    })
    .select()
    .single();

  if (matchError || !match) {
    return Response.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }

  // 3. Deduct AFTER success
  const { error: deductError } = await supabaseAdmin
    .from("users")
    .update({
      bounty: user.bounty - bet_amount,
    })
    .eq("id", user_id);

  if (deductError) {
    // optional rollback (important improvement later)
    return Response.json(
      { error: "Failed to deduct bounty" },
      { status: 500 }
    );
  }

  return Response.json({ data: match });
}