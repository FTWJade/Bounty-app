import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const match_id = searchParams.get("match_id");

  console.log("GET VOTES FOR:", match_id);

  if (!match_id) {
    return Response.json({ a: 0, b: 0 });
  }

  const { data } = await supabaseAdmin
    .from("match_votes")
    .select("vote")
    .eq("match_id", String(match_id));

  let a = 0;
  let b = 0;

  for (const v of data || []) {
    if (v.vote === "A") a++;
    if (v.vote === "B") b++;
  }

  return Response.json({ a, b });
}