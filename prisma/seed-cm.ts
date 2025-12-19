/**
 * CM License Seed Script
 *
 * Use this script to grant CM licenses to users.
 * Run with: npx ts-node prisma/seed-cm.ts
 *
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 * - ADMIN_CLERK_USER_ID: (Optional) Clerk user ID to make admin
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('CM License Seed Script\n');

  // Get admin user ID from environment
  const adminUserId = process.env.ADMIN_CLERK_USER_ID;

  if (!adminUserId) {
    console.log('ADMIN_CLERK_USER_ID not set.');
    console.log('\nTo grant a CM license:');
    console.log('1. Sign up at your app with Clerk');
    console.log('2. Find your Clerk user ID in the Clerk dashboard');
    console.log('3. Set ADMIN_CLERK_USER_ID=<your-clerk-user-id>');
    console.log('4. Run this script again\n');
    return;
  }

  console.log(`Granting enterprise CM license to user: ${adminUserId}\n`);

  // Check if user exists in our database
  let userAccount = await prisma.userAccount.findUnique({
    where: { id: adminUserId },
  });

  if (!userAccount) {
    // Create user account (normally done by Clerk webhook)
    console.log('User not found in database, creating...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    userAccount = await prisma.userAccount.create({
      data: {
        id: adminUserId,
        email: adminEmail,
        name: 'Admin',
        role: 'admin',
      },
    });

    console.log(`Created user account: ${userAccount.email}`);
  } else {
    // Update role to admin
    userAccount = await prisma.userAccount.update({
      where: { id: adminUserId },
      data: { role: 'admin' },
    });

    console.log(`Updated user role to admin: ${userAccount.email}`);
  }

  // Grant or update CM license
  const license = await prisma.cMRateLicense.upsert({
    where: { userId: adminUserId },
    update: {
      licenseType: 'enterprise',
      simulationsLimit: null, // Unlimited
      expiresAt: null, // Never expires
      isActive: true,
      grantedBy: 'system',
    },
    create: {
      userId: adminUserId,
      licenseType: 'enterprise',
      simulationsLimit: null, // Unlimited
      expiresAt: null, // Never expires
      isActive: true,
      grantedBy: 'system',
    },
  });

  console.log(`\nCM License granted:`);
  console.log(`  - User ID: ${adminUserId}`);
  console.log(`  - Email: ${userAccount.email}`);
  console.log(`  - License Type: ${license.licenseType}`);
  console.log(`  - Simulations: Unlimited`);
  console.log(`  - Expires: Never`);
  console.log(`  - Active: ${license.isActive}`);

  console.log('\n✅ Done! User can now access CM features.\n');
}

// Additional helper functions
async function listLicenses() {
  const licenses = await prisma.cMRateLicense.findMany({
    include: { user: true },
    orderBy: { grantedAt: 'desc' },
  });

  console.log('\nExisting CM Licenses:\n');

  if (licenses.length === 0) {
    console.log('No licenses found.\n');
    return;
  }

  for (const license of licenses) {
    console.log(`  ${license.user.email}`);
    console.log(`    Type: ${license.licenseType}`);
    console.log(`    Simulations: ${license.simulationsCreated}/${license.simulationsLimit ?? '∞'}`);
    console.log(`    Active: ${license.isActive}`);
    console.log(`    Expires: ${license.expiresAt?.toISOString() ?? 'Never'}`);
    console.log('');
  }
}

async function revokeLicense(userId: string) {
  await prisma.cMRateLicense.update({
    where: { userId },
    data: { isActive: false },
  });
  console.log(`License revoked for user: ${userId}`);
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'list':
    listLicenses()
      .catch(console.error)
      .finally(() => prisma.$disconnect());
    break;

  case 'revoke':
    const userIdToRevoke = process.argv[3];
    if (!userIdToRevoke) {
      console.log('Usage: npx ts-node prisma/seed-cm.ts revoke <userId>');
      process.exit(1);
    }
    revokeLicense(userIdToRevoke)
      .catch(console.error)
      .finally(() => prisma.$disconnect());
    break;

  default:
    main()
      .catch(console.error)
      .finally(() => prisma.$disconnect());
}
