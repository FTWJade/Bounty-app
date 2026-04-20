import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { user_id, match_id } = await req.json();

  if (!user_id || !match_id) {
    return new Response("Missing fields", { status: 400 });
  }

  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match) {
    return new Response("Match not found", { status: 404 });
  }

  // ❌ prevent joining your own match
  if (match.creator_id === user_id) {
    return new Response("You cannot join your own match", { status: 400 });
  }

  // ❌ prevent double join
  if (match.opponent_id) {
    return new Response("Match already full", { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("matches")
    .update({
      opponent_id: user_id,
      status: "active",
    })
    .eq("id", match_id)
    .select()
    .single();

  return Response.json({ data, error });
}