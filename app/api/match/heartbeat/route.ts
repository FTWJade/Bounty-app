import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { match_id, user_id } = await request.json();

  console.log("💓 HEARTBEAT:", { match_id, user_id });

  if (!match_id || !user_id) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("matches")
    .update({
      last_activity_at: now,
    })
    .eq("id", match_id);

  if (error) {
    console.log("❌ HEARTBEAT ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}