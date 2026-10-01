import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ReportWithRelations, ReportSchemaWithFields } from './reports.types';

export interface ParsedActivity {
  title: string;
  date: string;
  avenue: string;
  areaOfFocus: string;
  format: string;
  initiatedBy: string;
  membersParticipated: string;
  peopleReached: string;
  collaboratingClubs: string;
  links: string;
  summary: string;
  additionalDetails: Record<string, string>;
}

@Injectable()
export class ReportsExportService {
  /**
   * Safely parses JSON string or nested structures.
   */
  public parseIfJson(val: unknown): unknown {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.parseIfJson(parsed);
        } catch {
          return val;
        }
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val.map((item) => this.parseIfJson(item));
    }
    if (val !== null && typeof val === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        result[k] = this.parseIfJson(v);
      }
      return result;
    }
    return val;
  }

  /**
   * Humanizes field keys (e.g. "physical_meetings" -> "Physical meetings", "isPhysical" -> "Is physical")
   */
  public humanizeKey(key: string): string {
    const unslugged = key
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
    if (!unslugged) return key;
    return unslugged.charAt(0).toUpperCase() + unslugged.slice(1);
  }

  /**
   * Flattens a scalar, array, or object into a human-readable clean string without dumping raw JSON.
   */
  public formatValue(val: unknown, depth = 0): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '—';
    if (typeof val === 'string') {
      const parsed = this.parseIfJson(val);
      if (parsed !== val) {
        return this.formatValue(parsed, depth);
      }
      return val.trim() || '—';
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return '—';
      const isAllPrimitive = val.every((item) => item === null || typeof item !== 'object');
      if (isAllPrimitive) {
        return val.map((item) => (item === null || item === undefined ? '' : String(item))).join(', ');
      }
      return val
        .map((item, idx) => {
          if (item && typeof item === 'object') {
            const inner = Object.entries(item as Record<string, unknown>)
              .map(([k, v]) => `${this.humanizeKey(k)}: ${this.formatValue(v, depth + 1)}`)
              .join(' | ');
            return val.length > 1 ? `[${idx + 1}] ${inner}` : inner;
          }
          return String(item);
        })
        .join('; ');
    }

    if (typeof val === 'object') {
      const entries = Object.entries(val as Record<string, unknown>);
      if (entries.length === 0) return '—';
      return entries
        .map(([k, v]) => `${this.humanizeKey(k)}: ${this.formatValue(v, depth + 1)}`)
        .join(depth > 0 ? ', ' : '\n');
    }

    return String(val);
  }

  /**
   * Parses an activity object or array item into a standard humanized structure.
   */
  public parseActivity(raw: unknown): ParsedActivity {
    const act = (this.parseIfJson(raw) as Record<string, unknown>) || {};
    const title = String(
      act.activity_title ?? act.title ?? act.name ?? act.projectName ?? 'Untitled Activity',
    );
    const date = String(act.activity_date ?? act.date ?? '');
    const rawAvenue = String(act.avenue ?? '');
    const avenue = rawAvenue ? this.humanizeKey(rawAvenue) : '—';
    const areaOfFocus = String(act.area_of_focus ?? act.focus ?? act.category ?? '—');
    const isPhysical = act.is_physical ?? act.isPhysical;
    const format =
      isPhysical !== undefined && isPhysical !== null
        ? (isPhysical ? 'In-Person' : 'Virtual')
        : (act.format ? String(act.format) : '—');
    const initiatedBy = String(act.initiated_by ?? act.initiatedBy ?? '—');
    const membersParticipated = String(
      act.members_participated ?? act.attendance ?? act.attendees ?? '—',
    );
    const peopleReached = String(
      act.people_reached ?? act.beneficiaries ?? act.beneficiaryCount ?? '—',
    );

    const collaboratingClubs = this.formatValue(
      act.collaborating_clubs ?? act.collaboratingClubs ?? act.clubs,
    );
    const links = this.formatValue(act.photo_links ?? act.links ?? act.link);
    const summary = String(
      act.showcase_summary ?? act.summary ?? act.description ?? act.details ?? '',
    );

    const knownKeys = new Set([
      'activity_title',
      'title',
      'name',
      'projectName',
      'activity_date',
      'date',
      'avenue',
      'area_of_focus',
      'focus',
      'category',
      'is_physical',
      'isPhysical',
      'format',
      'initiated_by',
      'initiatedBy',
      'members_participated',
      'attendance',
      'attendees',
      'people_reached',
      'beneficiaries',
      'beneficiaryCount',
      'collaborating_clubs',
      'collaboratingClubs',
      'clubs',
      'photo_links',
      'links',
      'link',
      'showcase_summary',
      'summary',
      'description',
      'details',
    ]);

    const additionalDetails: Record<string, string> = {};
    for (const [k, v] of Object.entries(act)) {
      if (!knownKeys.has(k) && v !== null && v !== undefined && v !== '') {
        additionalDetails[this.humanizeKey(k)] = this.formatValue(v);
      }
    }

    return {
      title,
      date,
      avenue,
      areaOfFocus,
      format,
      initiatedBy,
      membersParticipated,
      peopleReached,
      collaboratingClubs,
      links,
      summary,
      additionalDetails,
    };
  }

  /**
   * Generates a CSV string for a single club report with structured tables for General Details & Activities.
   */
  generateReportCsv(report: ReportWithRelations, schema?: ReportSchemaWithFields | null): string {
    const rows: string[][] = [
      ['District 3011 - Club Monthly Report'],
      ['Club', report.club?.name ?? report.clubId],
      ['Month', report.month ? new Date(report.month).toISOString().slice(0, 7) : ''],
      ['Rotary Year', String(report.ryYear)],
      ['Status', report.status],
      ['Filed On Time', report.filedOnTime ? 'Yes' : 'No'],
      ['Submitted At', report.submittedAt ? new Date(report.submittedAt).toISOString() : ''],
      [],
      ['--- GENERAL DETAILS ---'],
      ['Section', 'Field', 'Value'],
    ];

    const rawValues = (report.values as Record<string, unknown>) || {};
    const parsedValues: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawValues)) {
      parsedValues[k] = this.parseIfJson(v);
    }

    const fieldMap = new Map((schema?.fields ?? []).map((f) => [f.fieldKey, f]));

    // 1. General Details Rows (all non-activities)
    for (const [key, val] of Object.entries(parsedValues)) {
      if (key === 'activities') continue;
      const field = fieldMap.get(key);
      const section = field?.section ?? 'General';
      const label = field?.label ?? this.humanizeKey(key);
      const displayVal = this.formatValue(val);
      rows.push([section, label, displayVal]);
    }

    // 2. Activities Child-Table
    const rawActivities = parsedValues.activities;
    let activitiesList: unknown[] = [];
    if (Array.isArray(rawActivities)) {
      activitiesList = rawActivities;
    } else if (typeof rawActivities === 'string') {
      const parsed = this.parseIfJson(rawActivities);
      if (Array.isArray(parsed)) activitiesList = parsed;
    }

    if (activitiesList.length > 0) {
      rows.push([]);
      rows.push(['--- ACTIVITIES ---']);
      rows.push([
        '#',
        'Activity Title',
        'Date',
        'Avenue',
        'Area of Focus',
        'Format',
        'Initiated By',
        'Members Participated',
        'People Reached',
        'Collaborating Clubs',
        'Links',
        'Summary / Details',
        'Additional Info',
      ]);

      activitiesList.forEach((rawAct, idx) => {
        const act = this.parseActivity(rawAct);
        const extra = Object.entries(act.additionalDetails)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ');

        rows.push([
          String(idx + 1),
          act.title,
          act.date,
          act.avenue,
          act.areaOfFocus,
          act.format,
          act.initiatedBy,
          act.membersParticipated,
          act.peopleReached,
          act.collaboratingClubs,
          act.links,
          act.summary,
          extra,
        ]);
      });
    }

    return this.serializeCsv(rows);
  }

  /**
   * Generates a summary CSV for multiple reports (e.g. Zone or District rollup).
   */
  generateRollupCsv(
    reports: ReportWithRelations[],
    title = 'District 3011 Reports Summary',
  ): string {
    const rows: string[][] = [
      [title],
      ['Generated', new Date().toISOString()],
      [],
      ['Club Name', 'Month', 'Status', 'Filed On Time', 'Submitted At', 'Notes'],
    ];

    for (const r of reports) {
      rows.push([
        r.club?.name ?? r.clubId,
        r.month ? new Date(r.month).toISOString().slice(0, 7) : '',
        r.status,
        r.filedOnTime ? 'Yes' : 'No',
        r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
        r.notes ?? '',
      ]);
    }

    return this.serializeCsv(rows);
  }

  /**
   * Generates a branded, cleanly formatted PDF buffer for a club report.
   */
  async generateReportPdf(
    report: ReportWithRelations,
    schema?: ReportSchemaWithFields | null,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Header Banner
        doc.rect(0, 0, doc.page.width, 95).fill('#1A1D2D');

        doc.fillColor('#D81B60').fontSize(10).text('ROTARACT DISTRICT ORGANIZATION 3011', 40, 22, {
          characterSpacing: 1.5,
        });

        const clubName = report.club?.name ?? 'Club Report';
        doc.fillColor('#FFFFFF').fontSize(18).text(clubName, 40, 38, {
          width: doc.page.width - 200,
        });

        const monthStr = report.month ? new Date(report.month).toISOString().slice(0, 7) : '—';
        doc.fillColor('#9CA3AF').fontSize(9).text(`Monthly Report • ${monthStr} • RY ${report.ryYear}`, 40, 68);

        // Status Badge
        doc.roundedRect(doc.page.width - 140, 32, 100, 26, 4).fill('#2A2E3D');
        doc.fillColor('#D81B60').fontSize(10).text(report.status.toUpperCase(), doc.page.width - 140, 39, {
          width: 100,
          align: 'center',
        });

        // Overview / Metadata Box
        const yStart = 115;
        doc.roundedRect(40, yStart, doc.page.width - 80, 52, 6).fillAndStroke('#F9FAFB', '#E5E7EB');
        doc.fillColor('#4B5563').fontSize(9);
        doc.text('Filed On Time:', 55, yStart + 12);
        doc.fillColor('#111827').text(report.filedOnTime ? 'Yes' : 'No', 140, yStart + 12);

        doc.fillColor('#4B5563').text('Submitted At:', 55, yStart + 28);
        doc.fillColor('#111827').text(
          report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : 'Draft',
          140,
          yStart + 28,
        );

        doc.fillColor('#4B5563').text('Report ID:', doc.page.width / 2, yStart + 12);
        doc.fillColor('#111827').text(report.id.slice(0, 16), doc.page.width / 2 + 65, yStart + 12);

        doc.fillColor('#4B5563').text('RY Period:', doc.page.width / 2, yStart + 28);
        doc.fillColor('#111827').text(`RY ${report.ryYear}`, doc.page.width / 2 + 65, yStart + 28);

        let currentY = yStart + 75;

        // Parse Values cleanly
        const rawValues = (report.values as Record<string, unknown>) || {};
        const parsedValues: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rawValues)) {
          parsedValues[k] = this.parseIfJson(v);
        }

        const fieldMap = new Map((schema?.fields ?? []).map((f) => [f.fieldKey, f]));

        // Group General Details by Section
        const sections = new Map<string, { label: string; value: string }[]>();
        for (const [key, val] of Object.entries(parsedValues)) {
          if (key === 'activities') continue;
          const field = fieldMap.get(key);
          const secName = field?.section || 'General Details';
          if (!sections.has(secName)) sections.set(secName, []);

          const displayVal = this.formatValue(val);
          sections.get(secName)!.push({ label: field?.label || this.humanizeKey(key), value: displayVal });
        }

        // Render General Details
        for (const [secName, items] of sections.entries()) {
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 40;
          }

          doc.fillColor('#D81B60').fontSize(12).text(secName, 40, currentY, {
            underline: true,
          } as unknown as Record<string, unknown>);
          currentY += 22;

          for (const item of items) {
            const labelWidth = 180;
            const valWidth = doc.page.width - 80 - labelWidth - 10;
            doc.fontSize(9);
            const itemHeight = Math.max(
              doc.heightOfString(item.label, { width: labelWidth }),
              doc.heightOfString(item.value, { width: valWidth }),
              16,
            );

            if (currentY + itemHeight > doc.page.height - 60) {
              doc.addPage();
              currentY = 40;
            }

            doc.fillColor('#4B5563').fontSize(9).text(item.label, 45, currentY, { width: labelWidth });
            doc.fillColor('#111827').fontSize(9).text(item.value, 45 + labelWidth + 10, currentY, { width: valWidth });
            currentY += itemHeight + 6;
          }

          currentY += 12;
        }

        // Render Activities Section
        const rawActivities = parsedValues.activities;
        let activitiesList: unknown[] = [];
        if (Array.isArray(rawActivities)) {
          activitiesList = rawActivities;
        } else if (typeof rawActivities === 'string') {
          const parsed = this.parseIfJson(rawActivities);
          if (Array.isArray(parsed)) activitiesList = parsed;
        }

        if (activitiesList.length > 0) {
          if (currentY > doc.page.height - 120) {
            doc.addPage();
            currentY = 40;
          }

          doc.fillColor('#D81B60').fontSize(13).text('Club Activities & Projects', 40, currentY, {
            underline: true,
          } as unknown as Record<string, unknown>);
          currentY += 25;

          activitiesList.forEach((rawAct, idx) => {
            const act = this.parseActivity(rawAct);

            // Estimate card height
            let estimatedHeight = 65;
            if (act.summary) {
              doc.fontSize(9);
              estimatedHeight += doc.heightOfString(act.summary, { width: doc.page.width - 110 }) + 10;
            }
            if (act.collaboratingClubs !== '—') estimatedHeight += 16;
            if (act.links !== '—') estimatedHeight += 16;

            if (currentY + estimatedHeight > doc.page.height - 60) {
              doc.addPage();
              currentY = 40;
            }

            const cardTop = currentY;
            const cardWidth = doc.page.width - 80;

            // Header line: # and title
            doc.fillColor('#111827').fontSize(11).text(`${idx + 1}. ${act.title}`, 45, currentY + 6, {
              width: cardWidth - 140,
            });

            // Avenue badge
            if (act.avenue && act.avenue !== '—') {
              doc.roundedRect(doc.page.width - 165, currentY + 4, 120, 18, 3).fill('#FCE7F3');
              doc.fillColor('#9D174D').fontSize(8).text(act.avenue.toUpperCase(), doc.page.width - 165, currentY + 9, {
                width: 120,
                align: 'center',
              });
            }

            currentY += 26;

            // Details line: Date, Focus, Attendance, Reached
            const metaParts: string[] = [];
            if (act.date) metaParts.push(`Date: ${act.date}`);
            if (act.areaOfFocus !== '—') metaParts.push(`Focus: ${act.areaOfFocus}`);
            if (act.format !== '—') metaParts.push(`Format: ${act.format}`);
            if (act.membersParticipated !== '—') metaParts.push(`Participants: ${act.membersParticipated}`);
            if (act.peopleReached !== '—') metaParts.push(`Reached: ${act.peopleReached}`);

            if (metaParts.length > 0) {
              doc.fillColor('#6B7280').fontSize(8.5).text(metaParts.join('  •  '), 45, currentY, {
                width: cardWidth - 10,
              });
              currentY += 16;
            }

            // Summary
            if (act.summary) {
              doc.fillColor('#374151').fontSize(9).text(act.summary, 45, currentY, {
                width: cardWidth - 10,
                lineGap: 2,
              });
              currentY += doc.heightOfString(act.summary, { width: cardWidth - 10, lineGap: 2 }) + 8;
            }

            // Collaborations & Links
            if (act.collaboratingClubs !== '—') {
              doc.fillColor('#4B5563').fontSize(8.5).text(`Collaborating Clubs: ${act.collaboratingClubs}`, 45, currentY, {
                width: cardWidth - 10,
              });
              currentY += 14;
            }

            if (act.links !== '—') {
              doc.fillColor('#2563EB').fontSize(8.5).text(`Links: ${act.links}`, 45, currentY, {
                width: cardWidth - 10,
              });
              currentY += 14;
            }

            // Draw card background / stroke
            const cardHeight = currentY - cardTop + 6;
            doc.roundedRect(40, cardTop, cardWidth, cardHeight, 4).stroke('#E5E7EB');

            currentY += 14;
          });
        }

        // Apply Footer to all buffered pages
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fillColor('#9CA3AF').fontSize(8).text(
            `District 3011 Official Monthly Report • Page ${i + 1} of ${pages.count} • Generated on ${new Date().toLocaleString()}`,
            40,
            doc.page.height - 25,
            { align: 'center', width: doc.page.width - 80 },
          );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private serializeCsv(rows: string[][]): string {
    return rows
      .map((row) =>
        row
          .map((cell) => {
            const escaped = String(cell ?? '').replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(','),
      )
      .join('\r\n');
  }
}
