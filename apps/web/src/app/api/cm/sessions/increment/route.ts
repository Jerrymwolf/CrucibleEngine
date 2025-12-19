import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { licenseId } = await req.json();

    if (!licenseId) {
      return NextResponse.json({ error: 'License ID required' }, { status: 400 });
    }

    // Verify the license belongs to this user
    const license = await prisma.cMRateLicense.findUnique({
      where: { id: licenseId },
    });

    if (!license || license.userId !== userId) {
      return NextResponse.json({ error: 'Invalid license' }, { status: 403 });
    }

    // Increment count
    await prisma.cMRateLicense.update({
      where: { id: licenseId },
      data: { simulationsCreated: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Increment simulation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
