import { PrismaClient } from '@prisma/client';
import { purgeAllStandalone } from '../src/cache/purge-all.standalone';
import { PERMISSIONS } from './seed/permissions';
import { ROLES } from './seed/roles';
import { JUDGED_CATEGORY_ORDER, POINT_CATEGORIES, POINT_RULES_2026 } from './seed/points';
import { SETTINGS } from './seed/settings';
import { CONTENT_BLOCKS } from './seed/content';
import { BADGES, INTERESTS, SKILLS } from './seed/tags-badges';
import { LEGACY_SECTIONS } from './seed/report-schema-v1';
import { REPORT_SCHEMA_V2_FIELDS } from './seed/report-schema-v2';
import { seedZonesFromClubs } from './seed/zones';
import { seedPublicContent } from './seed/public-content';

export const POINT_RULES_RY_YEAR = 2026;

type Json = Parameters<PrismaClient['setting']['create']>[0]['data']['value'];

async function seedPermissionsAndRoles(prisma: PrismaClient): Promise<void> {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description },
      update: { description },
    });
  }
  const permissions = await prisma.permission.findMany();
  const idByKey = new Map(permissions.map((p) => [p.key, p.id]));
  for (const role of ROLES) {
    const saved = await prisma.role.upsert({
      where: { key: role.key },
      create: {
        key: role.key,
        name: role.name,
        description: role.description,
        scopeType: role.scopeType,
        isSystem: true,
      },
      update: {
        name: role.name,
        description: role.description,
        scopeType: role.scopeType,
        isSystem: true,
      },
    });
    const wanted = role.permissions.map((k) => {
      const id = idByKey.get(k);
      if (!id) throw new Error(`role ${role.key} references unknown permission ${k}`);
      return id;
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: saved.id, permissionId: { notIn: wanted } },
    });
    await prisma.rolePermission.createMany({
      data: wanted.map((permissionId) => ({ roleId: saved.id, permissionId })),
      skipDuplicates: true,
    });
  }
}

async function seedPoints(prisma: PrismaClient): Promise<void> {
  for (const [i, [key, name]] of POINT_CATEGORIES.entries()) {
    const order = key === 'judged' ? JUDGED_CATEGORY_ORDER : i;
    await prisma.pointCategory.upsert({
      where: { key },
      create: { key, name, order },
      update: { name, order },
    });
  }
  const categories = await prisma.pointCategory.findMany();
  const categoryId = new Map(categories.map((c) => [c.key, c.id]));
  for (const rule of POINT_RULES_2026) {
    const cid = categoryId.get(rule.category);
    if (!cid) throw new Error(`rule ${rule.key} references unknown category ${rule.category}`);
    const data = {
      label: rule.label,
      categoryId: cid,
      ruleType: rule.ruleType,
      period: rule.period,
      sourceType: rule.sourceType,
      sourceKey: rule.sourceKey,
      points: rule.points ?? null,
      perUnitCap: rule.perUnitCap ?? null,
      ryYear: POINT_RULES_RY_YEAR,
    };
    const saved = await prisma.pointRule.upsert({
      where: { key: rule.key },
      create: { key: rule.key, ...data },
      update: data,
    });
    await prisma.pointRuleTier.deleteMany({ where: { ruleId: saved.id } });
    if (rule.tiers?.length) {
      await prisma.pointRuleTier.createMany({
        data: rule.tiers.map((t) => ({ ruleId: saved.id, ...t })),
      });
    }
  }
}

async function seedSettings(prisma: PrismaClient): Promise<void> {
  for (const [key, value] of Object.entries(SETTINGS)) {
    const json = value as Json;
    await prisma.setting.upsert({ where: { key }, create: { key, value: json }, update: {} });
  }
}

async function seedContent(prisma: PrismaClient): Promise<void> {
  for (const block of CONTENT_BLOCKS) {
    const value = block.value as Json;
    await prisma.contentBlock.upsert({
      where: { pageKey_sectionKey: { pageKey: block.pageKey, sectionKey: block.sectionKey } },
      create: {
        pageKey: block.pageKey,
        sectionKey: block.sectionKey,
        type: block.type,
        draftValue: value,
        publishedValue: value,
        publishedAt: new Date(),
      },
      update: {},
    });
  }
}

async function seedTagsAndBadges(prisma: PrismaClient): Promise<void> {
  for (const label of SKILLS)
    await prisma.skillTag.upsert({
      where: { label },
      create: { label, kind: 'skill' },
      update: { kind: 'skill' },
    });
  for (const label of INTERESTS)
    await prisma.skillTag.upsert({
      where: { label },
      create: { label, kind: 'interest' },
      update: { kind: 'interest' },
    });
  for (const b of BADGES)
    await prisma.badge.upsert({ where: { key: b.key }, create: b, update: { ...b } });
}

async function seedLegacyReportSchema(prisma: PrismaClient): Promise<void> {
  const schema = await prisma.reportFormSchema.upsert({
    where: { version: 1 },
    create: { version: 1, status: 'retired', publishedAt: new Date('2025-07-01T00:00:00Z') },
    update: {},
  });
  for (const [i, [fieldKey, label]] of LEGACY_SECTIONS.entries()) {
    await prisma.reportFormField.upsert({
      where: { schemaId_fieldKey: { schemaId: schema.id, fieldKey } },
      create: {
        schemaId: schema.id,
        section: 'Legacy report',
        fieldKey,
        label,
        type: 'textarea',
        order: i,
      },
      update: { label, order: i },
    });
  }
}

async function seedActiveReportSchema(prisma: PrismaClient): Promise<void> {
  const schema = await prisma.reportFormSchema.upsert({
    where: { version: 2 },
    create: { version: 2, status: 'active', publishedAt: new Date('2026-07-01T00:00:00Z') },
    update: { status: 'active' },
  });
  for (const [i, field] of REPORT_SCHEMA_V2_FIELDS.entries()) {
    await prisma.reportFormField.upsert({
      where: { schemaId_fieldKey: { schemaId: schema.id, fieldKey: field.fieldKey } },
      create: {
        schemaId: schema.id,
        section: field.section,
        fieldKey: field.fieldKey,
        label: field.label,
        type: field.type,
        options: field.options as never,
        required: field.required ?? false,
        order: i,
        helpText: field.helpText ?? null,
        perActivity: field.perActivity ?? false,
        pointSourceKey: field.pointSourceKey ?? null,
      },
      update: {
        label: field.label,
        type: field.type,
        options: field.options as never,
        required: field.required ?? false,
        order: i,
        helpText: field.helpText ?? null,
        perActivity: field.perActivity ?? false,
        pointSourceKey: field.pointSourceKey ?? null,
      },
    });
  }
}

export async function seedSystemData(
  prisma: PrismaClient,
  log: (msg: string) => void = () => undefined,
): Promise<void> {
  await seedPermissionsAndRoles(prisma);
  await seedZonesFromClubs(prisma, log);
  await seedPoints(prisma);
  await seedSettings(prisma);
  await seedContent(prisma);
  await seedTagsAndBadges(prisma);
  await seedLegacyReportSchema(prisma);
  await seedActiveReportSchema(prisma);
  await seedPublicContent(prisma);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedSystemData(prisma, console.log)
    .then(() => purgeAllStandalone())
    .then(() => console.log('system seed complete'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
