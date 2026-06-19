import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Push notification proxy used by MiniKit's `notificationProxyUrl`.
 *
 * MiniKit POSTs notification payloads here; the proxy is responsible for
 * forwarding them to the Farcaster hub using the app's secret credentials
 * (so your client-side code never sees the secret).
 *
 * Stub implementation: acknowledges receipt and logs. To send real push
 * notifications, store tokens via the /api/webhook handler, then forward
 * signed notifications to Farcaster's notify endpoint (see MiniKit docs).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[notification] received:', JSON.stringify(body).slice(0, 200));

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
