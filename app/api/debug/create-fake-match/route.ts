import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { match_id, creator_id, opponent_id } = await req.json();

  if (!match_id || !creator_id || !opponent_id) {
    return new Response("Missing fields", { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("matches")
    .insert({
      id: match_id,
      creator_id,
      opponent_id,
      status: "active",
    })
    .select()
    .single();

  return Response.json({ data, error });
}