import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import ProfileMatches from "@/components/ProfileMatches";
export default async function PublicProfile({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;
    const session = await getServerSession(authOptions);
    const { data: user, error } = await supabaseAdmin
        .from("bounties")
        .select("user_id, username, points, bounty, avatar_url")
        .eq("username", username)
        .maybeSingle();
    const isOwnProfile = session?.user?.id === user?.user_id;
    if (error) {
        console.error("PUBLIC PROFILE ERROR:", error);
        return <p>Something went wrong.</p>;
    }

    if (!user) {
        notFound();
    }
    const { data: matches, error: matchesError } = await supabaseAdmin
        .from("matches")
        .select(
            "id, creator_id, opponent_id, status, winner_id, created_at, mode, bounty_pool, title"
        )
        .or(`creator_id.eq.${user.user_id},opponent_id.eq.${user.user_id}`)
        .eq("status", "finished")
        .order("created_at", { ascending: false });
    return (
        <main className="min-h-screen p-6">
            <div className="flex items-center gap-4">
                {user.avatar_url ? (
                    <img
                        src={user.avatar_url}
                        alt={`${user.username}'s avatar`}
                        className="h-16 w-16 rounded-full"
                    />
                ) : (
                    <div className="h-16 w-16 rounded-full border" />
                )}

                <div>
                    <h1 className="text-2xl font-bold">
                        {user.username}
                    </h1>

                    <p className="text-gray-500">
                        bounty.town profile
                    </p>
                    {isOwnProfile && (
                        <p className="text-green-500">
                            This is your profile!
                        </p>
                    )}
                </div>
            </div>

            <section className="mt-8">
                <h2 className="text-xl font-semibold">
                    Balance
                </h2>

                <p className="mt-2">
                    Points: {user.points ?? 0}
                </p>

                <p>
                    Bounty: {user.bounty ?? 0}
                </p>
            </section>
            <section className="mt-8">
                <h2 className="text-xl font-semibold">
                    Past Bounties
                </h2>

                <ProfileMatches
                    matches={matches ?? []}
                    userId={user.user_id}
                />
            </section>
        </main>
    );
}