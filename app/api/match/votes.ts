import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { match_id } = req.query;

  const { data, error } = await supabase
    .from("match_votes")
    .select("vote")
    .eq("match_id", match_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  let a = 0;
  let b = 0;

  data.forEach((v) => {
    if (v.vote === "A") a++;
    if (v.vote === "B") b++;
  });

  return res.status(200).json({ a, b });
}