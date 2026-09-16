import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/access.decorators';
import { SessionContextPort } from '../common/auth/session-context.port';
import type { RequestContext } from '../common/types/access';
import { PrismaService } from '../prisma/prisma.service';

function parseDeviceSummary(ua?: string | null): string {
  if (!ua) return 'Unknown Device';
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  let os = 'Unknown OS';
  if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}

@ApiTags('admin')
@Controller('admin/sessions')
export class SessionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionContext: SessionContextPort,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('roles:manage', 'subdomain:ride:manage', 'ride:manage')
  async listActiveSessions(@Req() req: Request, @Query('scope') scope?: string) {
    const currentSession = await this.sessionContext.fromRequest(req);
    const currentSessionId = currentSession?.sessionId ?? null;

    const now = new Date();

    let rideUserIds: Set<string> | null = null;
    if (scope === 'ride') {
      const [rideRoleUsers, rideParticipants] = await Promise.all([
        this.prisma.userRole.findMany({
          where: {
            role: {
              key: { in: ['participant', 'ride_admin', 'project_admin:ride'] },
            },
          },
          select: { userId: true },
        }),
        this.prisma.rideParticipant.findMany({
          select: { userId: true, email: true },
        }),
      ]);

      const participantEmails = new Set(
        rideParticipants.map((p) => p.email.toLowerCase()),
      );
      const participantUserIds = rideParticipants
        .map((p) => p.userId)
        .filter((id): id is string => Boolean(id));

      const emailMatchedUsers = await this.prisma.user.findMany({
        where: {
          email: { in: [...participantEmails] },
        },
        select: { id: true },
      });

      rideUserIds = new Set([
        ...rideRoleUsers.map((r) => r.userId),
        ...participantUserIds,
        ...emailMatchedUsers.map((u) => u.id),
      ]);
    }

    const whereClause: any = {
      expiresAt: { gt: now },
    };
    if (rideUserIds) {
      whereClause.userId = { in: [...rideUserIds] };
    }

    const rows = await this.prisma.session.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                fullName: true,
                rotaryId: true,
                club: { select: { id: true, name: true, shortName: true } },
              },
            },
            userRoles: {
              select: {
                role: { select: { key: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.user.profile?.fullName || s.user.name,
      email: s.user.email,
      rotaryId: s.user.profile?.rotaryId || null,
      clubName: s.user.profile?.club?.shortName || s.user.profile?.club?.name || null,
      roles: s.user.userRoles.map((ur) => ur.role.name || ur.role.key),
      ipAddress: s.ipAddress || null,
      userAgent: s.userAgent || null,
      device: parseDeviceSummary(s.userAgent),
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  @Delete(':id')
  @RequirePermission('roles:manage', 'subdomain:ride:manage', 'ride:manage')
  async revokeSession(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.session.findUnique({
      where: { id },
      select: { id: true, userId: true, ipAddress: true, userAgent: true },
    });

    if (!existing) {
      throw new NotFoundException('Session not found or already terminated');
    }

    await this.prisma.session.delete({ where: { id } });

    await this.audit.record({
      actorId: ctx.user.id,
      action: 'auth.session_revoked',
      resourceType: 'session',
      resourceId: id,
      after: {
        targetUserId: existing.userId,
        ipAddress: existing.ipAddress,
        userAgent: existing.userAgent,
      },
    });

    return { success: true };
  }

  @Post('revoke-user/:userId')
  @RequirePermission('roles:manage', 'subdomain:ride:manage', 'ride:manage')
  async revokeUserSessions(
    @CurrentUser() ctx: RequestContext,
    @Param('userId') userId: string,
  ): Promise<{ count: number }> {
    const res = await this.prisma.session.deleteMany({
      where: { userId },
    });

    await this.audit.record({
      actorId: ctx.user.id,
      action: 'auth.user_sessions_revoked',
      resourceType: 'user',
      resourceId: userId,
      after: { revokedCount: res.count },
    });

    return { count: res.count };
  }

  @Post('revoke-all')
  @RequirePermission('roles:manage', 'subdomain:ride:manage', 'ride:manage')
  async revokeAllOtherSessions(
    @Req() req: Request,
    @CurrentUser() ctx: RequestContext,
    @Query('scope') scope?: string,
  ): Promise<{ count: number }> {
    const currentSession = await this.sessionContext.fromRequest(req);
    const currentSessionId = currentSession?.sessionId;

    const whereClause: any = {};
    if (currentSessionId) {
      whereClause.id = { not: currentSessionId };
    }

    if (scope === 'ride') {
      const [rideRoleUsers, rideParticipants] = await Promise.all([
        this.prisma.userRole.findMany({
          where: {
            role: { key: { in: ['participant', 'ride_admin', 'project_admin:ride'] } },
          },
          select: { userId: true },
        }),
        this.prisma.rideParticipant.findMany({
          select: { userId: true },
        }),
      ]);
      const targetUserIds = [
        ...rideRoleUsers.map((r) => r.userId),
        ...rideParticipants.map((p) => p.userId).filter(Boolean),
      ];
      whereClause.userId = { in: targetUserIds };
    }

    const res = await this.prisma.session.deleteMany({
      where: whereClause,
    });

    await this.audit.record({
      actorId: ctx.user.id,
      action: 'auth.all_sessions_revoked',
      resourceType: 'session',
      resourceId: null,
      after: { revokedCount: res.count, preservedSessionId: currentSessionId, scope },
    });

    return { count: res.count };
  }
}
