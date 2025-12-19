// =============================================================================
// LINK PARTICIPANT TOKEN API
// =============================================================================
//
// Links an anonymous participant token to a Clerk user account.
// This enables session history to persist across devices after sign-in.
//
// POST /api/auth/link-participant
// Body: { participantToken: string, clerkUserId: string }
//
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// =============================================================================
// CONSTANTS
// =============================================================================

const TOKEN_PREFIX = 'pt_';
const MIN_TOKEN_LENGTH = 24; // pt_ + 21 char nanoid

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId } = await auth();

    // Parse request body
    const body = await req.json();
    const { participantToken, clerkUserId } = body;

    // Verify the authenticated user matches the claimed user
    if (!userId || userId !== clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID mismatch' },
        { status: 401 }
      );
    }

    // Validate token format
    if (
      !participantToken ||
      typeof participantToken !== 'string' ||
      !participantToken.startsWith(TOKEN_PREFIX) ||
      participantToken.length < MIN_TOKEN_LENGTH
    ) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid token format' },
        { status: 400 }
      );
    }

    // Upsert the token record - create if new, update if exists
    const tokenRecord = await prisma.participantToken.upsert({
      where: { token: participantToken },
      update: {
        linkedUserId: clerkUserId,
        lastActiveAt: new Date(),
      },
      create: {
        token: participantToken,
        linkedUserId: clerkUserId,
      },
    });

    // Find any sessions this token participated in
    const participantSessions = await prisma.participantSession.findMany({
      where: { tokenId: tokenRecord.id },
      select: {
        sessionCode: true,
        teamId: true,
        joinedAt: true,
      },
    });

    // Log the linking
    console.log(
      `[Auth] Linked participant token ${participantToken.slice(0, 10)}... to user ${clerkUserId}. Sessions: ${participantSessions.length}`
    );

    return NextResponse.json({
      linked: true,
      tokenId: tokenRecord.id,
      sessionsTransferred: participantSessions.length,
      sessions: participantSessions.map((s: { sessionCode: string; teamId: string | null; joinedAt: Date }) => ({
        code: s.sessionCode,
        teamId: s.teamId,
        joinedAt: s.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[API] Link participant error:', error);

    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Token already linked to another account' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to link participant' },
      { status: 500 }
    );
  }
}
