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

  const isPvP = match.mode === "pvp";

  // 1. already in match
  const alreadyJoined =
    match.creator_id === user_id || match.opponent_id === user_id;

  if (alreadyJoined) {
    return Response.json({
      data: match,
      role: match.creator_id === user_id ? "creator" : "opponent",
      alreadyJoined: true,
    });
  }

  // 2. if PvP slot available → assign opponent FIRST (no payment yet if that's intended)
  if (isPvP && !match.opponent_id) {
    // continue to payment + join flow below
  } else if (isPvP && match.opponent_id) {
    return Response.json({
      data: match,
      role: "spectator",
    });
  }

  const cost = Number(match.bounty_pool ?? 0);

  // 🔒 4. ATOMIC deduction (prevents race condition)
  const { data: user } = await supabaseAdmin
    .from("bounties")
    .select("bounty")
    .eq("user_id", user_id)
    .single();

  const current = Number(user?.bounty ?? 0);

  if (current < cost) {
    return Response.json(
      { error: "Not enough bounty", current, required: cost },
      { status: 400 }
    );
  }

  const { error: deductError } = await supabaseAdmin
    .from("bounties")
    .update({
      bounty: current - cost,
    })
    .eq("user_id", user_id);

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