// =============================================================================
// SESSION VALIDATION API
// =============================================================================
//
// Validates a session code and returns session info.
// Used by participants before connecting to WebSocket.
//
// POST /api/session/validate
// Body: { sessionCode: string }
//
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// =============================================================================
// TYPES
// =============================================================================

interface ValidateResponse {
  valid: boolean;
  error?: string;
  phase?: string;
  status?: string;
  teams?: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  canJoin?: boolean;
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse<ValidateResponse>> {
  try {
    // Parse request body
    const body = await req.json();
    const { sessionCode } = body;

    // Validate input
    if (!sessionCode || typeof sessionCode !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Session code required' },
        { status: 400 }
      );
    }

    // Normalize session code
    const normalizedCode = sessionCode.trim().toUpperCase();

    // Validate format (8 chars, alphanumeric, no ambiguous chars)
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(normalizedCode)) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid session code format',
      });
    }

    // Look up session in database
    const session = await prisma.session.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        status: true,
        phase: true,
        teams: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    // Session not found
    if (!session) {
      return NextResponse.json({
        valid: false,
        error: 'Session not found',
      });
    }

    // Check if session is joinable
    const isCompleted = session.status === 'completed';
    const isArchived = session.status === 'archived';

    if (isCompleted || isArchived) {
      return NextResponse.json({
        valid: false,
        error: isCompleted ? 'Session has ended' : 'Session is archived',
        status: session.status,
      });
    }

    // Check if session is in a joinable phase
    const joinablePhases = ['lobby', 'briefing', 'pre_crisis', 'crisis'];
    const canJoin = joinablePhases.includes(session.phase || 'lobby');

    // Return session info
    return NextResponse.json({
      valid: true,
      phase: session.phase || 'lobby',
      status: session.status,
      teams: session.teams,
      canJoin,
    });
  } catch (error) {
    console.error('[API] Validate session error:', error);

    return NextResponse.json(
      { valid: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// OPTIONAL: GET for health check
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/session/validate',
    method: 'POST',
    description: 'Validate a session code and get session info',
    body: {
      sessionCode: 'string (required)',
    },
  });
}
