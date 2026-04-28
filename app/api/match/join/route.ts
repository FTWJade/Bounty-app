import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { user_id, match_id } = await req.json();

  if (!user_id || !match_id) {
    return new Response("Missing data", { status: 400 });
  }

  // 1. get match
  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (matchError || !match) {
    return new Response("Match not found", { status: 404 });
  }

  const isCreator = match.creator_id === user_id;
  const isParticipant =
    user_id === match.creator_id ||
    user_id === match.opponent_id;
  // 🚫 prevent joining your own match
  if (isCreator) {
    return Response.json({ error: "Cannot join your own match" }, { status: 400 });
  }

  // 🚫 prevent double join
  if (isParticipant) {
    return Response.json({ error: "Match already has opponent" }, { status: 400 });
  }

  const cost = Number(match.bounty_pool ?? 0);

  // 2. get user bounty
  const { data: user, error: userError } = await supabaseAdmin
    .from("bounties")
    .select("bounty")
    .eq("user_id", user_id)
    .single();

  if (userError || !user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const bounty = Number(user.bounty ?? 0);

  // 3. check balance
  if (bounty < cost) {
    return Response.json(
      { error: "Not enough bounty", current: bounty, required: cost },
      { status: 400 }
    );
  }

  // 🔒 4. ATOMIC deduction (prevents race condition)
  const { error: deductError } = await supabaseAdmin
    .from("bounties")
    .update({
      bounty: bounty - cost,
    })
    .eq("user_id", user_id)
    .gte("bounty", cost); // 👈 IMPORTANT

  if (deductError) {
    return Response.json(
      { error: "Failed to deduct bounty" },
      { status: 500 }
    );
  }

  // 5. join match
  const { data, error: joinError } = await supabaseAdmin
    .from("matches")
    .update({
      opponent_id: user_id,
      status: "active",
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", match_id)
    .is("opponent_id", null) // 👈 prevents double join race
    .select()
    .single();

  if (joinError || !data) {
    return Response.json(
      { error: "Match already taken" },
      { status: 400 }
    );
  }

  return Response.json({ data, role: "opponent" });
}