import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Farcaster Mini App webhook handler.
 *
 * Farcaster sends events here when a user adds/removes the mini app or when
 * a notification-enabled action occurs. Event types:
 *   - miniapp_added      (user added your app in the Farcaster client)
 *   - miniapp_removed    (user removed your app)
 *   - frame_added        (legacy alias for miniapp_added)
 *   - frame_removed      (legacy alias for miniapp_removed)
 *   - notification       (a direct notification event)
 *
 * NOTE on persistence: on Vercel serverless the filesystem is ephemeral, so
 * this handler currently only LOGS events. To actually track users, wire this
 * up to Upstash Redis (the env vars are already plumbed through .env.local).
 */

interface WebhookEvent {
  event?: string;
  fid?: number;
  notificationDetails?: unknown;
}

export async function POST(request: Request) {
  let body: WebhookEvent;
  try {
    body = (await request.json()) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event ?? 'unknown';
  const fid = body.fid;

  switch (event) {
    case 'miniapp_added':
    case 'frame_added':
      // TODO: store fid + notificationDetails in Upstash Redis.
      console.log(`[webhook] miniapp added by fid=${fid}`);
      break;
    case 'miniapp_removed':
    case 'frame_removed':
      // TODO: remove fid from Upstash Redis.
      console.log(`[webhook] miniapp removed by fid=${fid}`);
      break;
    case 'notification':
      console.log(`[webhook] notification event from fid=${fid}`);
      break;
    default:
      console.log(`[webhook] unhandled event: ${event}`);
  }

  // Farcaster expects a 200 with no body (or a simple ack).
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
