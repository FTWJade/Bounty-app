import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const match_id = searchParams.get("match_id");

  if (!match_id) {
    return Response.json({
      a: 0, b: 0,
      bountyA: 0, bountyB: 0,
      twitchA: 0, twitchB: 0,
      bountyVoters: 0,
      twitchVoters: 0,
    });
  }

  const [{ data: bountyVotes }, { data: twitchVotes }] = await Promise.all([
    supabaseAdmin
      .from("match_votes")
      .select("vote")
      .eq("match_id", String(match_id)),
    supabaseAdmin
      .from("twitch_votes")
      .select("vote")
      .eq("match_id", String(match_id)),
  ]);

  let bountyA = 0;
  let bountyB = 0;
  let twitchA = 0;
  let twitchB = 0;

  for (const v of bountyVotes || []) {
    if (v.vote === "A") bountyA++;
    if (v.vote === "B") bountyB++;
  }

  for (const v of twitchVotes || []) {
    if (v.vote === "A") twitchA++;
    if (v.vote === "B") twitchB++;
  }

  return Response.json({
    a: bountyA + twitchA,
    b: bountyB + twitchB,
    bountyA,
    bountyB,
    twitchA,
    twitchB,
    bountyVoters: (bountyVotes || []).length,
    twitchVoters: (twitchVotes || []).length,
  });
}
