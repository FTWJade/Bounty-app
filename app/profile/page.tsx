"use client";

import { useSession } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading profile...</div>;
  }

  if (!session?.user?.id) {
    return <div>Please log in to view your profile.</div>;
  }

  const username = session.user.name ?? "Unknown";

  return (
    <main className="min-h-screen p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>

        <div className="flex items-center gap-2">
          <span className="text-purple-500">●</span>
          <span>{username}</span>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Balance</h2>
        <p className="mt-2">Points: 0</p>
      </section>
    </main>
  );
}