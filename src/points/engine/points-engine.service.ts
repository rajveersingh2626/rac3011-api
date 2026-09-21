import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import type { PointSourceAdapter } from '../adapters/point-source.port';
import { POINT_SOURCE_ADAPTERS } from '../adapters/point-source.port';
import { PointsEntriesRepository } from '../points-entries.repository';
import { PointsRepository } from '../points.repository';
import type { PointRuleRow, SourceTypeKey } from '../points.types';
import {
  CLUB_FACTS_UPDATED_EVENT,
  POINTS_RECOMPUTED_EVENT,
  type ClubFactsUpdatedEvent,
} from '../points.events';
import {
  REPORT_DELETED_EVENT,
  REPORT_RESET_EVENT,
  REPORT_SUBMITTED_EVENT,
  type ReportDeletedEvent,
  type ReportResetEvent,
  type ReportSubmittedEvent,
} from '../../reports/report.events';
import { evaluateRule } from './evaluate-rule';
import type { EvalRule, Trace } from './rule-eval.types';

export type RecomputeParams = { clubId: string; ryYear: number; month?: Date; trigger: string };

type ComputedOp = { ruleId: string; categoryId: string; periodKey: string; trace: Trace | null };

function toEvalRule(rule: PointRuleRow): EvalRule {
  return {
    id: rule.id,
    key: rule.key,
    label: rule.label,
    categoryKey: rule.categoryKey,
    ruleType: rule.ruleType,
    period: rule.period,
    points: rule.points,
    perUnitCap: rule.perUnitCap,
    tiers: rule.tiers,
  };
}

@Injectable()
export class PointsEngineService {
  private readonly logger = new Logger('PointsEngineService');

  constructor(
    private readonly rules: PointsRepository,
    private readonly entries: PointsEntriesRepository,
    @Inject(POINT_SOURCE_ADAPTERS)
    private readonly adapters: Record<SourceTypeKey, PointSourceAdapter>,
    private readonly events: EventEmitter2,
  ) {}

  async recompute(params: RecomputeParams): Promise<void> {
    const activeRules = await this.rules.listRules(params.ryYear, true);
    const activeRuleIds = activeRules.map((r) => r.id);
    const onceRuleIds = activeRules.filter((r) => r.period === 'once').map((r) => r.id);
    const alreadyAwarded = await this.entries.findOnceAwardedRuleIds(params.clubId, onceRuleIds);

    const ops: ComputedOp[] = [];
    for (const rule of activeRules) {
      if (rule.period === 'once' && alreadyAwarded.has(rule.id)) continue;
      const adapter = this.adapters[rule.sourceType];
      const evalRule = toEvalRule(rule);
      const inputs = await adapter.inputs({
        clubId: params.clubId,
        ryYear: params.ryYear,
        month: params.month,
        rule: {
          ...evalRule,
          numeratorKey: rule.numeratorKey,
          denominatorKey: rule.denominatorKey,
          sourceKey: rule.sourceKey,
        },
      });
      for (const { periodKey, input } of inputs) {
        const trace = evaluateRule(evalRule, input, false);
        ops.push({ ruleId: rule.id, categoryId: rule.categoryId, periodKey, trace });
      }
    }

    await this.entries.transaction(async (tx) => {
      for (const op of ops) {
        if (op.trace) {
          await this.entries.upsertComputedEntry(tx, {
            clubId: params.clubId,
            ryYear: params.ryYear,
            ruleId: op.ruleId,
            categoryId: op.categoryId,
            periodKey: op.periodKey,
            points: op.trace.points,
            trace: op.trace,
          });
        } else {
          await this.entries.deleteComputedEntry(tx, params.clubId, op.ruleId, op.periodKey);
        }
      }
      await this.entries.deleteStaleComputed(tx, params.clubId, params.ryYear, activeRuleIds);
    });

    this.events.emit(POINTS_RECOMPUTED_EVENT, { clubId: params.clubId, ryYear: params.ryYear });
  }

  @OnEvent(REPORT_SUBMITTED_EVENT)
  async onReportSubmitted(event: ReportSubmittedEvent): Promise<void> {
    try {
      await this.recompute({
        clubId: event.clubId,
        ryYear: event.ryYear,
        month: new Date(`${event.month}-01T00:00:00Z`),
        trigger: REPORT_SUBMITTED_EVENT,
      });
    } catch (err) {
      this.logger.error(
        `recompute after ${REPORT_SUBMITTED_EVENT} failed: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(REPORT_RESET_EVENT)
  async onReportReset(event: ReportResetEvent): Promise<void> {
    try {
      const periodKey = event.month.slice(0, 7);
      const activeRules = await this.rules.listRules(event.ryYear, true);
      const reportRuleIds = activeRules
        .filter((r) => r.sourceType === 'report_field' || r.sourceType === 'project_collaboration')
        .map((r) => r.id);

      await this.entries.transaction(async (tx) => {
        for (const ruleId of reportRuleIds) {
          await this.entries.deleteComputedEntry(tx, event.clubId, ruleId, periodKey);
        }
      });

      await this.recompute({
        clubId: event.clubId,
        ryYear: event.ryYear,
        trigger: REPORT_RESET_EVENT,
      });
    } catch (err) {
      this.logger.error(
        `recompute after ${REPORT_RESET_EVENT} failed: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(REPORT_DELETED_EVENT)
  async onReportDeleted(event: ReportDeletedEvent): Promise<void> {
    try {
      const periodKey = event.month.slice(0, 7);
      const activeRules = await this.rules.listRules(event.ryYear, true);
      const reportRuleIds = activeRules
        .filter((r) => r.sourceType === 'report_field' || r.sourceType === 'project_collaboration')
        .map((r) => r.id);

      await this.entries.transaction(async (tx) => {
        for (const ruleId of reportRuleIds) {
          await this.entries.deleteComputedEntry(tx, event.clubId, ruleId, periodKey);
        }
      });

      await this.recompute({
        clubId: event.clubId,
        ryYear: event.ryYear,
        trigger: REPORT_DELETED_EVENT,
      });
    } catch (err) {
      this.logger.error(
        `recompute after ${REPORT_DELETED_EVENT} failed: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(CLUB_FACTS_UPDATED_EVENT)
  async onClubFactsUpdated(event: ClubFactsUpdatedEvent): Promise<void> {
    try {
      await this.recompute({
        clubId: event.clubId,
        ryYear: event.ryYear,
        trigger: CLUB_FACTS_UPDATED_EVENT,
      });
    } catch (err) {
      this.logger.error(
        `recompute after ${CLUB_FACTS_UPDATED_EVENT} failed: ${(err as Error).message}`,
      );
    }
  }
}
