import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Clerk Webhook Handler
 *
 * Syncs user accounts from Clerk to our database.
 * This enables:
 * - CM license tracking per user
 * - Session ownership
 * - Role-based access control
 */

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get headers
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  // Validate headers
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('[Clerk Webhook] Missing svix headers');
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('[Clerk Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle events
  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id);
        const email = primaryEmail?.email_address || email_addresses[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(' ') || null;

        if (!email) {
          console.warn('[Clerk Webhook] User without email:', id);
          break;
        }

        await prisma.userAccount.upsert({
          where: { id },
          update: { email, name },
          create: {
            id,
            email,
            name,
            role: 'participant',
          },
        });

        console.log(`[Clerk Webhook] User ${evt.type === 'user.created' ? 'created' : 'updated'}: ${email}`);
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;

        if (!id) {
          console.warn('[Clerk Webhook] Delete event without user ID');
          break;
        }

        // Soft delete or actual delete based on preference
        // Using actual delete here - the CM license will cascade delete
        await prisma.userAccount.delete({
          where: { id },
        }).catch(() => {
          // Ignore if not found
          console.log(`[Clerk Webhook] User ${id} not found for deletion`);
        });

        console.log(`[Clerk Webhook] User deleted: ${id}`);
        break;
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${evt.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Clerk Webhook] Database error:', error);
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    );
  }
}
