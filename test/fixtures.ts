import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/auth/legacy-password';
import { testPrisma } from './db';

export const TEST_PASSWORD = 'Correct-Horse-Battery-Staple-1';

export async function createZone(name: string): Promise<{ id: string; name: string }> {
  const prisma = testPrisma();
  const zone = await prisma.zone.findUniqueOrThrow({ where: { name } });
  return zone;
}

export async function createClub(input: {
  id: string;
  name: string;
  zoneName?: string;
}): Promise<{ id: string; zoneId: string | null }> {
  const prisma = testPrisma();
  const zoneId = input.zoneName ? (await createZone(input.zoneName)).id : null;
  const club = await prisma.club.create({
    data: { id: input.id, name: input.name, zoneId, isActive: true },
  });
  return { id: club.id, zoneId: club.zoneId };
}

export type RoleGrant = {
  key: string;
  scopeType: 'none' | 'club' | 'zone' | 'project';
  scopeId?: string;
};

export async function createUser(input: {
  email: string;
  name: string;
  clubId?: string;
  roles?: RoleGrant[];
}): Promise<{ id: string; email: string }> {
  const prisma = testPrisma();
  const userId = randomUUID();
  await prisma.user.create({
    data: { id: userId, name: input.name, email: input.email, emailVerified: true },
  });
  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: userId,
      providerId: 'credential',
      issuer: 'local:credential',
      userId,
      password: await hashPassword(TEST_PASSWORD),
    },
  });
  if (input.clubId) {
    await prisma.memberProfile.create({
      data: {
        userId,
        fullName: input.name,
        email: input.email,
        clubId: input.clubId,
        status: 'approved',
      },
    });
  }
  for (const grant of input.roles ?? []) {
    const role = await prisma.role.findUniqueOrThrow({ where: { key: grant.key } });
    await prisma.userRole.create({
      data: { userId, roleId: role.id, scopeType: grant.scopeType, scopeId: grant.scopeId ?? null },
    });
  }
  return { id: userId, email: input.email };
}
