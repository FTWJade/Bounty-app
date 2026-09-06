import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const CLIENT_ID = process.env.TWITCH_BOT_CLIENT_ID;
const ACCESS_TOKEN = process.env.TWITCH_BOT_ACCESS_TOKEN;
const BOT_USER_ID = process.env.TWITCH_BOT_USER_ID;
const CHANNEL = process.env.TWITCH_BOT_CHANNEL;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function loadTwitchConnections() {
  const { data, error } = await supabase
    .from("twitch_connections")
    .select("user_id, twitch_id");

  if (error) {
    console.error("Failed to load Twitch connections:", error);
    return [];
  }

  console.log("Connected Twitch accounts:", data);

  return data ?? [];
}

async function getTwitchConnection(twitchId: string) {
  const { data, error } = await supabase
    .from("twitch_connections")
    .select("user_id, twitch_id")
    .eq("twitch_id", twitchId)
    .maybeSingle();

  if (error) {
    console.error("Failed to check Twitch connection:", error);
    return null;
  }

  return data;
}

if (!CLIENT_ID || !ACCESS_TOKEN || !BOT_USER_ID || !CHANNEL) {
  throw new Error(
    "Missing TWITCH_BOT_CLIENT_ID, TWITCH_BOT_ACCESS_TOKEN, TWITCH_BOT_USER_ID, or TWITCH_BOT_CHANNEL"
  );
}

const TWITCH_API = "https://api.twitch.tv/helix";
const EVENTSUB_WS = "wss://eventsub.wss.twitch.tv/ws";

let socket: WebSocket | null = null;
let reconnecting = false;



async function twitchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TWITCH_API}${path}`, {
    ...init,
    headers: {
      "Client-Id": CLIENT_ID!,
      Authorization: `Bearer ${ACCESS_TOKEN!}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Twitch API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

async function getUser(login: string) {
  const result = await twitchApi<{
    data: Array<{ id: string; login: string; display_name: string }>;
  }>(`/users?login=${encodeURIComponent(login)}`);

  const user = result.data[0];
  if (!user) throw new Error(`Twitch user not found: ${login}`);
  return user;
}

async function getUsersByIds(twitchIds: string[]) {
  if (twitchIds.length === 0) return [];

  const params = twitchIds
    .map((id) => `id=${encodeURIComponent(id)}`)
    .join("&");

  const result = await twitchApi<{
    data: Array<{
      id: string;
      login: string;
      display_name: string;
    }>;
  }>(`/users?${params}`);

  return result.data;
}

async function sendChatMessage(broadcasterId: string, message: string) {
  await twitchApi("/chat/messages", {
    method: "POST",
    body: JSON.stringify({
      broadcaster_id: broadcasterId,
      sender_id: BOT_USER_ID,
      message,
    }),
  });

  console.log(`→ ${message}`);
}

async function subscribeToChat(
  sessionId: string,
  broadcasterId: string,
  channelLogin: string
) {
  await twitchApi("/eventsub/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: broadcasterId,
        user_id: BOT_USER_ID,
      },
      transport: {
        method: "websocket",
        session_id: sessionId,
      },
    }),
  });

  console.log(`Subscribed to ${channelLogin}'s chat`);
}

async function handleChatMessage(notification: any) {
  const event = notification.payload.event;
  const connection = await getTwitchConnection(event.broadcaster_user_id);

  if (!connection) {
    console.log(`Ignoring message from disconnected channel: ${event.broadcaster_user_name}`);
    return;
  }
  const text = event.message.text.trim();

  console.log(`<${event.chatter_user_name}> ${text}`);

  if (text.toLowerCase() === "!hello") {
    await sendChatMessage(
      event.broadcaster_user_id,
      "🐈‍⬛ meow! bounty.town bot online :3"
    );
  }
}

function connect(url = EVENTSUB_WS) {
  if (reconnecting) return;

  socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    console.log("Connected to Twitch EventSub WebSocket");
  });

  socket.addEventListener("message", async (message) => {
    try {
      const data = JSON.parse(String(message.data));
      const type = data.metadata?.message_type;

      if (type === "session_welcome") {
        const sessionId = data.payload.session.id;
        const connections = await loadTwitchConnections();
        const twitchIds = connections.map((connection) => connection.twitch_id);
        const broadcasters = await getUsersByIds(twitchIds);

        for (const broadcaster of broadcasters) {
          await subscribeToChat(
            sessionId,
            broadcaster.id,
            broadcaster.login
          );
          async function unsubscribeFromChat(
            broadcasterId: string
          ) {
            const result = await twitchApi<{
              data: Array<{
                id: string;
                type: string;
                condition: {
                  broadcaster_user_id: string;
                };
              }>;
            }>(
              `/eventsub/subscriptions?broadcaster_user_id=${encodeURIComponent(
                broadcasterId
              )}&user_id=${encodeURIComponent(BOT_USER_ID!)}`
            );

            for (const subscription of result.data) {
              if (subscription.type !== "channel.chat.message") continue;

              await twitchApi(
                `/eventsub/subscriptions?id=${encodeURIComponent(subscription.id)}`,
                {
                  method: "DELETE",
                }
              );

              console.log(`Unsubscribed from Twitch channel ${broadcasterId}`);
            }
          }
        }

        return;
      }

      if (
        type === "notification" &&
        data.payload?.subscription?.type === "channel.chat.message"
      ) {
        await handleChatMessage(data);
        return;
      }

      if (type === "session_reconnect") {
        const reconnectUrl = data.payload.session.reconnect_url;
        reconnecting = true;
        socket?.close();
        connect(reconnectUrl);
        reconnecting = false;
      }
    } catch (error) {
      console.error("Twitch message handling error:", error);
    }
  });

  socket.addEventListener("close", () => {
    if (reconnecting) return;

    console.log("Twitch connection closed; reconnecting in 5 seconds...");
    setTimeout(() => connect(), 5000);
  });

  socket.addEventListener("error", (error) => {
    console.error("Twitch WebSocket error:", error);
  });
}

(async () => {
  const broadcaster = await getUser(CHANNEL!);

  console.log("Starting bounty.town Twitch bot...");
  await loadTwitchConnections();
  console.log(`Bot user ID: ${BOT_USER_ID}`);
  console.log(`Channel: ${broadcaster.login} (${broadcaster.id})`);

  connect();
})();
