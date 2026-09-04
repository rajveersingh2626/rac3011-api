import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ReportRequestResponseRow, ReportRequestRow } from './reports.types';

@Injectable()
export class ReportRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(): Promise<ReportRequestRow[]> {
    return this.prisma.reportRequest.findMany({ orderBy: { dueAt: 'desc' } });
  }

  async findById(id: string): Promise<ReportRequestRow | null> {
    return this.prisma.reportRequest.findUnique({ where: { id } });
  }

  async findResponses(requestId: string): Promise<ReportRequestResponseRow[]> {
    return this.prisma.reportRequestResponse.findMany({ where: { requestId } });
  }

  async findResponse(requestId: string, clubId: string): Promise<ReportRequestResponseRow | null> {
    return this.prisma.reportRequestResponse.findUnique({
      where: { requestId_clubId: { requestId, clubId } },
    });
  }

  async create(data: {
    title: string;
    description: string | null;
    questions: unknown;
    audience: unknown;
    dueAt: Date;
    createdById: string;
  }): Promise<ReportRequestRow> {
    return this.prisma.reportRequest.create({
      data: {
        title: data.title,
        description: data.description,
        questions: data.questions as Prisma.InputJsonValue,
        audience: data.audience as Prisma.InputJsonValue,
        dueAt: data.dueAt,
        createdById: data.createdById,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      questions: unknown;
      audience: unknown;
      dueAt: Date;
    }>,
  ): Promise<ReportRequestRow> {
    return this.prisma.reportRequest.update({
      where: { id },
      data: {
        ...data,
        questions: data.questions as Prisma.InputJsonValue | undefined,
        audience: data.audience as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reportRequest.delete({ where: { id } });
  }

  async upsertResponse(
    requestId: string,
    clubId: string,
    answers: unknown,
    submittedById: string,
  ): Promise<ReportRequestResponseRow> {
    return this.prisma.reportRequestResponse.upsert({
      where: { requestId_clubId: { requestId, clubId } },
      create: { requestId, clubId, answers: answers as Prisma.InputJsonValue, submittedById },
      update: { answers: answers as Prisma.InputJsonValue, submittedById },
    });
  }

  async clubZoneId(clubId: string): Promise<string | null> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { zoneId: true },
    });
    return club?.zoneId ?? null;
  }
}
