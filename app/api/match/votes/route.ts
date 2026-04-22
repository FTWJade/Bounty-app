import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const match_id = searchParams.get("match_id");

  if (!match_id) {
    return Response.json({ error: "Missing match_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("match_votes")
    .select("vote")
    .eq("match_id", match_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  let a = 0;
  let b = 0;

  for (const v of data || []) {
    if (v.vote === "A") a++;
    if (v.vote === "B") b++;
  }

  return Response.json({ a, b });
}