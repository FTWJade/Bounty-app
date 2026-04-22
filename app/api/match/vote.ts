import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();

  const { match_id, user_id, vote } = body;

  const { error } = await supabase.from("match_votes").insert({
    match_id,
    user_id,
    vote,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}