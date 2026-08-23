import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function PublicProfile({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;

    const { data: user, error } = await supabaseAdmin
        .from("bounties")
        .select("username, points, bounty, avatar_url")
        .eq("username", username)
        .maybeSingle();

    if (error) {
        console.error("PUBLIC PROFILE ERROR:", error);
        return <p>Something went wrong.</p>;
    }

    if (!user) {
        notFound();
    }

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
        </main>
    );
}