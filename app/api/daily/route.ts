import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { error } from "console";

export async function POST(req: NextRequest) {
  //const { user_id } = await req.json();

const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const user_id = session.user.id;


  const today = new Date().toISOString().split("T")[0];

  const { data: user } = await supabaseAdmin
    .from("bounties")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: "No user" });

  let pointsAdded = 0;
  let unlocked: string[] = [];

  // 📅 DAILY LOGIN REWARD
  if (user.last_login !== today) {
    pointsAdded += 100;

    await supabaseAdmin
      .from("bounties")
      .update({
        points: (user.points || 0) + 100,
        last_login: today,
      })
      .eq("user_id", user_id);

    unlocked.push("daily_login");
  }

  // 🏆 ACHIEVEMENT: FIRST LOGIN
await supabaseAdmin
  .from("achievements")
  .upsert(
    {
      user_id,
      achievement_id: "first_login",
    },
    {
      onConflict: "user_id,achievement_id",
    }
  );

unlocked.push("first_login");


  return NextResponse.json({ pointsAdded, unlocked });
}