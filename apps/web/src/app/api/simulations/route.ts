/**
 * Simulations List API
 *
 * Returns list of sessions available for export.
 */

import { NextResponse } from 'next/server';
import { requireCMLicense } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Inline type for session with counts
interface SessionWithCount {
  id: string;
  code: string;
  status: string;
  companyName: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  _count: { teams: number; decisions: number };
}

export async function GET() {
  // Check CM license
  const authResult = await requireCMLicense();
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.reason },
      { status: 401 }
    );
  }

  try {
    const sessions = await prisma.session.findMany({
      where: {
        crucibleMasterId: authResult.userId,
        status: { in: ['completed', 'active', 'lobby'] },
      },
      include: {
        _count: {
          select: {
            teams: true,
            decisions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sessionList = sessions.map((s: SessionWithCount) => ({
      id: s.id,
      code: s.code,
      status: s.status,
      companyName: s.companyName,
      createdAt: s.createdAt.toISOString(),
      startedAt: s.startedAt?.toISOString() || null,
      completedAt: s.completedAt?.toISOString() || null,
      teamCount: s._count.teams,
      decisionCount: s._count.decisions,
      exportable: s._count.decisions > 0,
    }));

    return NextResponse.json({ sessions: sessionList });
  } catch (error) {
    console.error('[Simulations] Failed to list:', error);
    return NextResponse.json(
      { error: 'Failed to list simulations' },
      { status: 500 }
    );
  }
}
