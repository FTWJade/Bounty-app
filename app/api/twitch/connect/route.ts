import { NextResponse } from "next/server";

export async function GET() {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.TWITCH_BOT_CLIENT_ID!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/twitch/callback`,
        scope: "user:read:chat user:write:chat",
    });

    return NextResponse.redirect(
        `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
    );
}