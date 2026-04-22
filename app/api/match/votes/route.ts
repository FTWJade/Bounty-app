import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const match_id = searchParams.get("match_id");

  const { data, error } = await supabaseAdmin
    .from("match_votes")
    .select("vote, user_id")
    .eq("match_id", match_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("user_id, username");

  const nameMap = Object.fromEntries(
    (users || []).map((u) => [u.user_id, u.username])
  );

  let aUsers: string[] = [];
  let bUsers: string[] = [];

  data.forEach((v) => {
    const name = nameMap[v.user_id] || "Unknown";

    if (v.vote === "A") aUsers.push(name);
    if (v.vote === "B") bUsers.push(name);
  });

  return Response.json({
    a: aUsers.length,
    b: bUsers.length,
    aUsers,
    bUsers,
  });
}