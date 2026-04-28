import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { user_id, match_id } = await req.json();

  if (!user_id || !match_id) {
    return new Response("Missing data", { status: 400 });
  }

  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match) {
    return new Response("Match not found", { status: 404 });
  }

  const isCreator = match.creator_id === user_id;

  // 🧠 CASE 1: opponent join ONLY
  if (!match.opponent_id && !isCreator) {
    
    // 1. fetch user balance
    const { data: user } = await supabaseAdmin
      .from("bounties")
      .select("bounty")
      .eq("id", user_id)
      .single();

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const cost = Number(match.bounty_pool ?? 0);
    const bounty = Number(user.bounty ?? 0);

    // 2. check balance
    if (bounty < cost) {
      return Response.json(
        { error: "Not enough bounty", required: cost, current: bounty },
        { status: 400 }
      );
    }

    // 3. atomic deduction (SAFE)
    const { error: deductError } = await supabaseAdmin
      .from("bounties")
      .update({
        bounty: bounty - cost,
      })
      .eq("id", user_id)
      .gte("bounty", cost); // prevents race conditions

    if (deductError) {
      return Response.json(
        { error: "Failed to deduct bounty" },
        { status: 500 }
      );
    }

    // 4. join match
    const { data } = await supabaseAdmin
      .from("matches")
      .update({
        opponent_id: user_id,
        status: "active",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", match_id)
      .select()
      .single();

    return Response.json({ data, role: "opponent" });
  }

  // 🗳 CASE 2: VOTING ONLY (NO ECONOMY)
  await supabaseAdmin.from("match_votes").upsert({
    match_id,
    user_id,
  });

  return Response.json({
    success: true,
    role: "voter",
  });
}