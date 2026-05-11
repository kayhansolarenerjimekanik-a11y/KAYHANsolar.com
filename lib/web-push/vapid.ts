export function getPublicVapidKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return key && key.length > 0 ? key : null;
}

export function isWebPushEnabled(): boolean {
  return getPublicVapidKey() !== null;
}
