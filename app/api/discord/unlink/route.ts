import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { user_id } = await req.json();

  if (!user_id) {
    return new Response("Missing user_id", { status: 400 });
  }

  console.log("UNLINK USER ID:", user_id);

  const { data, error } = await supabaseAdmin
    .from("bounties")
    .update({
      discord_id: null,
      username: null,
      avatar_url: null,
    })
    .eq("user_id", user_id)
    .select(); // 👈 important for debugging

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    console.error("UNLINK ERROR:", error);
    return new Response("Failed", { status: 500 });
  }

  return Response.json({ ok: true, data });
}