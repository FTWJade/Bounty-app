import { supabaseAdmin } from "@/lib/supabaseAdmin";

function generateMatchId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const body = await req.json();
  const { user_id, mode } = body;

  if (!user_id) {
    return new Response("Missing user_id", { status: 400 });
  }

  const matchId = generateMatchId();

  const { data, error } = await supabaseAdmin
    .from("matches")
    .insert({
      id: matchId,
      creator_id: user_id,
      opponent_id: null,
      status: "open",
      mode: mode || "pvp",
      last_activity_at: new Date().toISOString()
    })
    .select()
    .single();

  return Response.json({ data, error });
}