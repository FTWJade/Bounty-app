import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EXPIRE_MINUTES = 10;

function isExpired(match: any) {
  const createdTime = new Date(match.created_at).getTime();
  const now = Date.now();

  return now - createdTime > EXPIRE_MINUTES * 60 * 1000;
}

export async function POST(req: Request) {
  const { user_id, match_id } = await req.json();

  if (!user_id || !match_id) {
    return new Response("Missing fields", { status: 400 });
  }

  // 1. get match FIRST
  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match || error) {
    return new Response("Match not found", { status: 404 });
  }

  // 2. check expiry
  if (match.status === "open" && isExpired(match)) {
    await supabaseAdmin
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", match_id);

    return new Response("Match expired", { status: 410 });
  }

  // 3. prevent joining your own match
  if (match.creator_id === user_id) {
    return new Response("You cannot join your own match", { status: 400 });
  }

  // 4. prevent double join
  if (match.opponent_id) {
    return new Response("Match already full", { status: 400 });
  }

  // 5. join match
  const { data, error: updateError } = await supabaseAdmin
    .from("matches")
    .update({
      opponent_id: user_id,
      status: "active",
      last_activity_at: new Date().toISOString()
    })
    .eq("id", match_id)
    .select()
    .single();

  return Response.json({ data, error: updateError });
}