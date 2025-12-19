import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';

export type LicenseType = 'trial' | 'individual' | 'team' | 'enterprise';

export interface LicenseInfo {
  id: string;
  licenseType: LicenseType;
  simulationsLimit: number | null;
  simulationsCreated: number;
  simulationsRemaining: number | null;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface AuthResult {
  authorized: boolean;
  reason?: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  license?: LicenseInfo;
}

/**
 * Check if the current user has an active CM license.
 * Use this to gate access to Crucible Master features.
 */
export async function requireCMLicense(): Promise<AuthResult> {
  const { userId } = await auth();

  if (!userId) {
    return {
      authorized: false,
      reason: 'Not authenticated. Please sign in.',
    };
  }

  // Get user from our database
  const userAccount = await prisma.userAccount.findUnique({
    where: { id: userId },
    include: { cmLicense: true },
  });

  if (!userAccount) {
    return {
      authorized: false,
      reason: 'User account not found. Please try signing out and back in.',
      userId,
    };
  }

  // Check license
  const license = userAccount.cmLicense;

  if (!license) {
    return {
      authorized: false,
      reason: 'CM license required. Contact administrator to obtain a license.',
      userId,
      user: {
        id: userAccount.id,
        email: userAccount.email,
        name: userAccount.name,
        role: userAccount.role,
      },
    };
  }

  // Check if license is active
  if (!license.isActive) {
    return {
      authorized: false,
      reason: 'Your CM license has been deactivated. Contact administrator.',
      userId,
      user: {
        id: userAccount.id,
        email: userAccount.email,
        name: userAccount.name,
        role: userAccount.role,
      },
    };
  }

  // Check expiration
  if (license.expiresAt && license.expiresAt < new Date()) {
    return {
      authorized: false,
      reason: 'Your CM license has expired. Contact administrator to renew.',
      userId,
      user: {
        id: userAccount.id,
        email: userAccount.email,
        name: userAccount.name,
        role: userAccount.role,
      },
    };
  }

  // Check simulation limit
  if (
    license.simulationsLimit !== null &&
    license.simulationsCreated >= license.simulationsLimit
  ) {
    return {
      authorized: false,
      reason: `Simulation limit reached (${license.simulationsCreated}/${license.simulationsLimit}). Upgrade your license for more.`,
      userId,
      user: {
        id: userAccount.id,
        email: userAccount.email,
        name: userAccount.name,
        role: userAccount.role,
      },
      license: {
        id: license.id,
        licenseType: license.licenseType as LicenseType,
        simulationsLimit: license.simulationsLimit,
        simulationsCreated: license.simulationsCreated,
        simulationsRemaining: 0,
        expiresAt: license.expiresAt,
        isActive: license.isActive,
      },
    };
  }

  // All checks passed
  const simulationsRemaining =
    license.simulationsLimit !== null
      ? license.simulationsLimit - license.simulationsCreated
      : null;

  return {
    authorized: true,
    userId,
    user: {
      id: userAccount.id,
      email: userAccount.email,
      name: userAccount.name,
      role: userAccount.role,
    },
    license: {
      id: license.id,
      licenseType: license.licenseType as LicenseType,
      simulationsLimit: license.simulationsLimit,
      simulationsCreated: license.simulationsCreated,
      simulationsRemaining,
      expiresAt: license.expiresAt,
      isActive: license.isActive,
    },
  };
}

/**
 * Get the current user's info without checking license.
 * Use this for general user information.
 */
export async function getCurrentUserInfo(): Promise<AuthResult> {
  const { userId } = await auth();

  if (!userId) {
    return {
      authorized: false,
      reason: 'Not authenticated',
    };
  }

  const userAccount = await prisma.userAccount.findUnique({
    where: { id: userId },
    include: { cmLicense: true },
  });

  if (!userAccount) {
    // User exists in Clerk but not in our DB yet
    const clerkUser = await currentUser();
    return {
      authorized: true,
      userId,
      user: clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
            role: 'participant',
          }
        : undefined,
    };
  }

  const license = userAccount.cmLicense;
  const simulationsRemaining =
    license?.simulationsLimit !== null && license?.simulationsLimit !== undefined
      ? license.simulationsLimit - license.simulationsCreated
      : null;

  return {
    authorized: true,
    userId,
    user: {
      id: userAccount.id,
      email: userAccount.email,
      name: userAccount.name,
      role: userAccount.role,
    },
    license: license
      ? {
          id: license.id,
          licenseType: license.licenseType as LicenseType,
          simulationsLimit: license.simulationsLimit,
          simulationsCreated: license.simulationsCreated,
          simulationsRemaining,
          expiresAt: license.expiresAt,
          isActive: license.isActive,
        }
      : undefined,
  };
}

/**
 * Increment the simulation count for a user's license.
 * Call this when a new simulation is created.
 */
export async function incrementSimulationCount(userId: string): Promise<void> {
  await prisma.cMRateLicense.update({
    where: { userId },
    data: {
      simulationsCreated: {
        increment: 1,
      },
    },
  });
}

/**
 * Check if a user is an admin.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.userAccount.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'admin';
}

/**
 * Grant a CM license to a user.
 * Only admins should be able to call this.
 */
export async function grantCMLicense(
  userId: string,
  options: {
    licenseType: LicenseType;
    simulationsLimit?: number | null;
    expiresAt?: Date | null;
    grantedBy: string;
  }
): Promise<void> {
  await prisma.cMRateLicense.upsert({
    where: { userId },
    update: {
      licenseType: options.licenseType,
      simulationsLimit: options.simulationsLimit ?? null,
      expiresAt: options.expiresAt ?? null,
      isActive: true,
      grantedBy: options.grantedBy,
    },
    create: {
      userId,
      licenseType: options.licenseType,
      simulationsLimit: options.simulationsLimit ?? null,
      expiresAt: options.expiresAt ?? null,
      isActive: true,
      grantedBy: options.grantedBy,
    },
  });

  // Also update user role to crucible_master
  await prisma.userAccount.update({
    where: { id: userId },
    data: { role: 'crucible_master' },
  });
}
