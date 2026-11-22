"use client";

export type AuthMessage =
  | { type: "logout"; reason?: "logout" | "deleted" | "revoked" }
  | { type: "login" }
  | { type: "profile"; username?: string; profile_photo_url?: string | null }
  | { type: "sessions" };

const CHANNEL_NAME = "rusauth-auth";
const STORAGE_KEY = "rusauth-auth-message";

const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface Envelope {
  from: string;
  message: AuthMessage;
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function broadcastAuth(message: AuthMessage): void {
  const envelope: Envelope = { from: TAB_ID, message };
  const bc = getChannel();

  if (bc) {
    bc.postMessage(envelope);
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...envelope, at: Date.now() }),
    );
  } catch {}
}

export function subscribeAuth(
  handler: (message: AuthMessage) => void,
): () => void {
  const bc = getChannel();

  const onBroadcast = (event: MessageEvent<Envelope>) => {
    if (event.data?.from !== TAB_ID) handler(event.data.message);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;

    try {
      const envelope = JSON.parse(event.newValue) as Envelope;

      if (envelope.from !== TAB_ID) handler(envelope.message);
    } catch {}
  };

  bc?.addEventListener("message", onBroadcast);
  window.addEventListener("storage", onStorage);

  return () => {
    bc?.removeEventListener("message", onBroadcast);
    window.removeEventListener("storage", onStorage);
  };
}
