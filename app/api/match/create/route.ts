import { supabaseAdmin } from "@/lib/supabaseAdmin";

function generateMatchId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const { user_id } = await req.json();

  if (!user_id) {
    return new Response("Missing user_id", { status: 400 });
  }

  const matchId = generateMatchId();
    await supabaseAdmin.from("bounties").upsert({
    user_id: "DEBUG_OPPONENT",
    username: "Debug Bot",
    points: 0,
    });
  const { data, error } = await supabaseAdmin
    .from("matches")
    .insert({
      id: matchId, // 👈 custom ID
      creator_id: user_id,
      status: "open",
    })
    .select()
    .single();

  return Response.json({ data, error });
}