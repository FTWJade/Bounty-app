import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EXPIRE_MINUTES = 10;

function isExpired(match: any) {
  const createdTime = new Date(match.created_at).getTime();
  const now = Date.now();

  return now - createdTime > EXPIRE_MINUTES * 60 * 1000;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select(`
      *,
      creator:bounties!matches_creator_id_fkey(username),
      opponent:bounties!matches_opponent_id_fkey(username)
    `)
    .eq("id", id)
    .single();

  // ❌ not found
  if (!match || error) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // 🧠 auto-expire logic
  if (match.status === "open" && isExpired(match)) {
    await supabaseAdmin
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", match.id);

    match.status = "cancelled";
  }

  return Response.json({ data: match });
}