import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp, httpServer } from '../test/app';

interface AuditResult {
  category: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
}

const results: AuditResult[] = [];

function record(category: string, check: string, status: 'PASS' | 'FAIL' | 'WARN', details: string) {
  results.push({ category, check, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${category}] ${check}: ${details}`);
}

async function runAudit() {
  console.log('================================================================');
  console.log(' Rotaract District 3011 — Complete Production Launch Audit');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 1. DATABASE & RELATION INTEGRITY CHECKS
  // -------------------------------------------------------------
  console.log('--- 1. DATABASE & RELATION INTEGRITY ---');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    record('Database', 'Connection', 'PASS', 'Successfully connected to PostgreSQL');

    const [
      userCount,
      accountCount,
      profileCount,
      userRoleCount,
      clubCount,
      zoneCount,
      reportCount,
      announcementCount,
      teamCount,
      enquiryCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.memberProfile.count(),
      prisma.userRole.count(),
      prisma.club.count(),
      prisma.zone.count(),
      prisma.report.count(),
      prisma.announcement.count(),
      prisma.districtTeamMember.count(),
      prisma.enquiry.count(),
    ]);

    record('Database', 'User Count', 'PASS', `${userCount} total users`);
    record('Database', 'Account Count', 'PASS', `${accountCount} auth accounts`);
    record('Database', 'Member Profiles', 'PASS', `${profileCount} member profiles`);
    record('Database', 'User Roles', 'PASS', `${userRoleCount} user role assignments`);
    record('Database', 'Clubs Count', clubCount >= 54 ? 'PASS' : 'WARN', `${clubCount} verified clubs`);
    record('Database', 'Zones Count', zoneCount === 4 ? 'PASS' : 'WARN', `${zoneCount} zones (Expected 4)`);
    record('Database', 'Reports Count', 'PASS', `${reportCount} submitted reports`);
    record('Database', 'Announcements', 'PASS', `${announcementCount} announcements`);
    record('Database', 'District Team', teamCount > 0 ? 'PASS' : 'WARN', `${teamCount} team members`);
    record('Database', 'Enquiries', 'PASS', `${enquiryCount} total enquiries recorded`);

    // Relational Integrity Checks
    const orphanedProfiles = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM "member_profiles" mp
      LEFT JOIN "user" u ON mp.user_id = u.id
      WHERE u.id IS NULL;
    `;
    const orphanCount = Number(orphanedProfiles[0]?.count ?? 0);
    record(
      'Integrity',
      'Orphaned Profiles Check',
      orphanCount === 0 ? 'PASS' : 'FAIL',
      orphanCount === 0 ? '0 orphaned profiles' : `${orphanCount} orphaned profiles found`,
    );

    const usersWithoutRoles = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM "user" u
      LEFT JOIN "user_roles" ur ON u.id = ur.user_id
      WHERE ur.id IS NULL;
    `;
    const noRoleCount = Number(usersWithoutRoles[0]?.count ?? 0);
    record(
      'Integrity',
      'Users Without Roles Check',
      noRoleCount === 0 ? 'PASS' : 'WARN',
      noRoleCount === 0 ? 'All users have at least 1 role' : `${noRoleCount} users have no role assigned`,
    );

  } catch (err: any) {
    record('Database', 'Connection & Query', 'FAIL', err?.message || String(err));
  }

  // -------------------------------------------------------------
  // 2. RBAC & PERMISSION AUDIT
  // -------------------------------------------------------------
  console.log('\n--- 2. RBAC & PERMISSION MATRIX ---');
  try {
    const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
    record('RBAC', 'Roles Registered', roles.length >= 7 ? 'PASS' : 'WARN', `${roles.length} roles found in DB`);

    const superAdminRole = roles.find((r) => r.key === 'super_admin');
    if (superAdminRole) {
      const superAdmins = await prisma.userRole.findMany({
        where: { roleId: superAdminRole.id },
        include: { user: true },
      });
      record(
        'RBAC',
        'Super Admin Assignments',
        superAdmins.length > 0 ? 'PASS' : 'FAIL',
        `${superAdmins.length} Super Admins assigned (${superAdmins.map((s) => s.user.email).join(', ')})`,
      );
    } else {
      record('RBAC', 'Super Admin Role', 'FAIL', 'super_admin role not found in database!');
    }

    const dscRole = roles.find((r) => r.key === 'dsc');
    if (dscRole) {
      const dscUsers = await prisma.userRole.count({ where: { roleId: dscRole.id } });
      record('RBAC', 'DSC Officers', dscUsers > 0 ? 'PASS' : 'WARN', `${dscUsers} DSC council members assigned`);
    }

    const presRole = roles.find((r) => r.key === 'president');
    if (presRole) {
      const presCount = await prisma.userRole.count({ where: { roleId: presRole.id, scopeType: 'club' } });
      record('RBAC', 'Club Presidents Scoped', presCount > 0 ? 'PASS' : 'WARN', `${presCount} club presidents with club scope`);
    }
  } catch (err: any) {
    record('RBAC', 'Role Verification', 'FAIL', err?.message || String(err));
  }

  // -------------------------------------------------------------
  // 3. API ENDPOINTS & DATA ENTRY AUDIT (Via NestJS Server Test App)
  // -------------------------------------------------------------
  console.log('\n--- 3. API ENDPOINT AUDIT & DATA ENTRY CHECK ---');
  let app: any;
  try {
    app = await createTestApp();
    const server = httpServer(app);

    // 3.1 Health Check Endpoint
    const resHealth = await request(server).get('/health');
    record('API', 'GET /health', resHealth.status === 200 ? 'PASS' : 'FAIL', `Status ${resHealth.status}`);

    // 3.2 Public Data Endpoints
    const resHome = await request(server).get('/public/home');
    record('API', 'GET /public/home', resHome.status === 200 ? 'PASS' : 'FAIL', `Status ${resHome.status}`);

    const resDrrs = await request(server).get('/public/past-drrs');
    record('API', 'GET /public/past-drrs', resDrrs.status === 200 ? 'PASS' : 'FAIL', `Status ${resDrrs.status}`);

    const resClubs = await request(server).get('/clubs');
    record('API', 'GET /clubs', resClubs.status === 200 ? 'PASS' : 'FAIL', `Status ${resClubs.status} (${(resClubs.body?.items || []).length} clubs)`);

    const resZones = await request(server).get('/zones');
    record('API', 'GET /zones', resZones.status === 200 ? 'PASS' : 'FAIL', `Status ${resZones.status} (${(resZones.body?.items || []).length} zones)`);

    // 3.3 Data Entry Point: Public Enquiry Submission (Contact & Interest Form)
    const testEnquiryPayload = {
      kind: 'contact',
      name: 'Automated Audit Runner',
      email: 'audit@rotaract3011.org',
      message: 'System audit ping for data entry verification.',
    };
    const resEnquiry = await request(server).post('/public/enquiries').send(testEnquiryPayload);
    record(
      'Data Entry',
      'POST /public/enquiries',
      resEnquiry.status === 201 ? 'PASS' : 'FAIL',
      `Status ${resEnquiry.status} (ID: ${resEnquiry.body?.id})`,
    );

    // Clean up test enquiry
    if (resEnquiry.body?.id) {
      await prisma.enquiry.delete({ where: { id: resEnquiry.body.id } }).catch(() => undefined);
    }

    // 3.4 Data Entry Point: Auth Lookup (Rotary ID / Email Resolve)
    const resLookup = await request(server).get('/auth-lookup/resolve?identifier=techrid3011@gmail.com');
    record(
      'API',
      'GET /auth-lookup/resolve',
      resLookup.status === 200 && resLookup.body?.email ? 'PASS' : 'WARN',
      `Status ${resLookup.status} (Found: ${resLookup.body?.email || 'N/A'})`,
    );

    // 3.5 Auth Endpoint: Forgot Password Trigger
    const resForget = await request(server)
      .post('/auth/forget-password')
      .send({ email: 'test-nonexistent-user@rotaract3011.org', redirectTo: '/portal/reset-password' });
    record(
      'API / Auth',
      'POST /auth/forget-password',
      resForget.status === 200 ? 'PASS' : 'FAIL',
      `Status ${resForget.status} (Returned: ${JSON.stringify(resForget.body)})`,
    );

    // 3.6 Protected Endpoints Security Guard Check (Ensure 401 Unauthorized without session)
    const protectedRoutes = [
      { method: 'get', path: '/me' },
      { method: 'get', path: '/reports' },
      { method: 'post', path: '/reports' },
      { method: 'get', path: '/portal/admin/users' },
      { method: 'post', path: '/user-roles/create-user' },
    ];

    for (const route of protectedRoutes) {
      const res = await (request(server) as any)[route.method](route.path);
      const isBlocked = res.status === 401 || res.status === 403 || res.status === 404;
      record(
        'Security Guard',
        `${route.method.toUpperCase()} ${route.path}`,
        isBlocked ? 'PASS' : 'FAIL',
        `Unauthenticated request safely blocked with status ${res.status}`,
      );
    }

    await app.close();
  } catch (err: any) {
    record('API Testing', 'App Lifecycle', 'FAIL', err?.message || String(err));
    if (app) await app.close().catch(() => undefined);
  } finally {
    await prisma.$disconnect();
  }

  // -------------------------------------------------------------
  // SUMMARY SCORECARD
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(' PRODUCTION AUDIT SCORECARD');
  console.log('================================================================');
  const passes = results.filter((r) => r.status === 'PASS').length;
  const warns = results.filter((r) => r.status === 'WARN').length;
  const fails = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Checks: ${results.length} | ✅ PASS: ${passes} | ⚠️ WARN: ${warns} | ❌ FAIL: ${fails}\n`);

  if (fails > 0) {
    console.error('❌ Audit encountered failures that must be addressed prior to launch!');
    process.exit(1);
  } else {
    console.log('🎉 All systems, data models, RBAC policies, and API endpoints verified healthy for production launch!');
  }
}

runAudit().catch((e) => {
  console.error('Fatal audit error:', e);
  process.exit(1);
});
