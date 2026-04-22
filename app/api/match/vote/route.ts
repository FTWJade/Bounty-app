import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { match_id, user_id, vote } = await request.json();

  console.log("VOTE:", { match_id, user_id, vote });

const { data, error } = await supabaseAdmin
  .from("match_votes")
  .upsert(
    {
      match_id: String(match_id),
      user_id: String(user_id),
      vote,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "match_id,user_id",
    }
  );

console.log("UPSERT RESULT:", { data, error });

if (error) {
  console.log("SUPABASE ERROR:", error);
  return Response.json({ error: error.message }, { status: 500 });
}

  return Response.json({ success: true });
}