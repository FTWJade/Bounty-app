import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { match_id } = req.body;

  const { error } = await supabase
    .from("match_votes")
    .delete()
    .eq("match_id", match_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}