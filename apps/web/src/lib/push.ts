const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function setupPush(sessionId: string): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    // Register service worker
    const reg = await navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` });

    // Get VAPID public key
    const keyRes = await fetch(`${BASE}/api/push/vapid-public-key`);
    if (!keyRes.ok) return;
    const { publicKey } = (await keyRes.json()) as { publicKey: string };
    if (!publicKey) return;

    // Request permission
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    // Subscribe
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });

    const json = sub.toJSON();
    await fetch(`${BASE}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-id": sessionId },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      }),
    });
  } catch {
    // Push setup is non-critical — silently ignore errors
  }
}
