import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateRideResourceInput, RideResourceFilter } from './dto/ride-resource.dto';

@Injectable()
export class RideResourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filter: RideResourceFilter, page: number = 1, pageSize: number = 50) {
    const where: Prisma.RideResourceWhereInput = {};
    if (filter.category && filter.category !== 'all') {
      where.category = filter.category;
    }
    if (filter.scope && filter.scope !== 'all') {
      where.scope = filter.scope;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rideResource.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rideResource.count({ where }),
    ]);

    return { items, total };
  }

  async findAllForParticipant(email?: string, clubName?: string, district?: string) {
    const orConditions: Prisma.RideResourceWhereInput[] = [
      { scope: 'all' },
    ];

    if (email) {
      orConditions.push({
        scope: 'member',
        targetMemberEmail: { equals: email, mode: 'insensitive' },
      });
    }

    if (clubName) {
      orConditions.push({
        scope: 'club',
        targetClubName: { equals: clubName, mode: 'insensitive' },
      });
    }

    if (district) {
      orConditions.push({
        targetDistrict: { equals: district, mode: 'insensitive' },
      });
    }

    return this.prisma.rideResource.findMany({
      where: { OR: orConditions },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.rideResource.findUnique({ where: { id } });
  }

  async create(data: CreateRideResourceInput) {
    return this.prisma.rideResource.create({
      data: {
        title: data.title,
        category: data.category || 'guidelines',
        scope: data.scope || 'all',
        targetClubName: data.targetClubName || null,
        targetMemberEmail: data.targetMemberEmail || null,
        targetDistrict: data.targetDistrict || null,
        driveUrl: data.driveUrl,
        description: data.description || null,
        order: data.order || 0,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.rideResource.delete({ where: { id } });
  }
}
