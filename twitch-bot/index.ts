import "dotenv/config";

const CLIENT_ID = process.env.TWITCH_BOT_CLIENT_ID;
const ACCESS_TOKEN = process.env.TWITCH_BOT_ACCESS_TOKEN;
const CHANNEL = process.env.TWITCH_BOT_CHANNEL;

if (!CLIENT_ID || !ACCESS_TOKEN || !CHANNEL) {
  throw new Error(
    "Missing TWITCH_BOT_CLIENT_ID, TWITCH_BOT_ACCESS_TOKEN, or TWITCH_BOT_CHANNEL"
  );
}

const TWITCH_API = "https://api.twitch.tv/helix";
const EVENTSUB_WS = "wss://eventsub.wss.twitch.tv/ws";

let socket: WebSocket | null = null;
let sessionId: string | null = null;

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

async function sendChatMessage(broadcasterId: string, message: string) {
  await twitchApi("/chat/messages", {
    method: "POST",
    body: JSON.stringify({
      broadcaster_id: broadcasterId,
      sender_id: broadcasterId,
      message,
    }),
  });
}

async function subscribeToChat(session: string, broadcasterId: string) {
  await twitchApi("/eventsub/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: broadcasterId,
        user_id: broadcasterId,
      },
      transport: {
        method: "websocket",
        session_id: session,
      },
    }),
  });
}

type ChatMessageNotification = {
  metadata: {
    message_type: string;
  };
  payload: {
    subscription: {
      type: string;
    };
    event: {
      broadcaster_user_id: string;
      chatter_user_id: string;
      chatter_user_login: string;
      chatter_user_name: string;
      message: { text: string };
    };
  };
};

async function handleChatMessage(notification: ChatMessageNotification) {
  const event = notification.payload.event;
  const text = event.message.text.trim();

  if (text.toLowerCase() === "!hello") {
    await sendChatMessage(event.broadcaster_user_id, "🐈‍⬛ meow! bounty.town bot online :3");
  }
}

function connect() {
  socket = new WebSocket(EVENTSUB_WS);

  socket.addEventListener("open", () => {
    console.log("Connected to Twitch EventSub WebSocket");
  });

  socket.addEventListener("message", async (message) => {
    try {
      const notification = JSON.parse(String(message.data));
      const type = notification.metadata?.message_type;

      if (type === "session_welcome") {
        sessionId = notification.payload.session.id;
        console.log(`EventSub session ready: ${sessionId}`);

        const broadcaster = await getUser(CHANNEL!);
        await subscribeToChat(sessionId, broadcaster.id);
        console.log(`Subscribed to chat for ${broadcaster.login}`);
        return;
      }

      if (type === "notification" && notification.payload?.subscription?.type === "channel.chat.message") {
        await handleChatMessage(notification as ChatMessageNotification);
      }

      if (type === "session_reconnect") {
        const reconnectUrl = notification.payload.session.reconnect_url;
        console.log("Twitch requested a reconnect");
        socket?.close();
        socket = new WebSocket(reconnectUrl);
      }
    } catch (error) {
      console.error("Twitch message handling error:", error);
    }
  });

  socket.addEventListener("close", () => {
    console.log("Twitch connection closed; reconnecting in 5 seconds...");
    sessionId = null;
    setTimeout(connect, 5000);
  });

  socket.addEventListener("error", (error) => {
    console.error("Twitch WebSocket error:", error);
  });
}

console.log(`Starting bounty.town Twitch bot for ${CHANNEL}...`);
connect();
