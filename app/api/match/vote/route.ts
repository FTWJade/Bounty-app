import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  
  const THREE_MINUTES = 3 * 60 * 1000;
  const now = Date.now();

  

  const { match_id, user_id, vote } = body;

  const { data: existing } = await supabaseAdmin
  .from("match_votes")
  .select("*")
  .eq("match_id", match_id)
  .eq("user_id", user_id)
  .single();

  if (existing) {
  const lastVoteTime = new Date(existing.updated_at).getTime();

  if (now - lastVoteTime < THREE_MINUTES) {
    return Response.json(
      { error: "Wait 3 minutes before changing vote" },
      { status: 429 }
    );
  }
}

if (existing) {
  await supabaseAdmin
    .from("match_votes")
    .update({
      vote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
} else {
  await supabaseAdmin.from("match_votes").insert({
    match_id,
    user_id,
    vote,
    updated_at: new Date().toISOString(),
  });
}

  return Response.json({ success: true });
}