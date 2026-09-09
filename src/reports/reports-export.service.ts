import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ReportWithRelations, ReportSchemaWithFields } from './reports.types';

@Injectable()
export class ReportsExportService {
  /**
   * Generates a CSV string for a single club report.
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
      ['Section', 'Field', 'Value'],
    ];

    const values = (report.values as Record<string, unknown>) || {};
    const fieldMap = new Map((schema?.fields ?? []).map((f) => [f.fieldKey, f]));

    for (const [key, val] of Object.entries(values)) {
      const field = fieldMap.get(key);
      const section = field?.section ?? 'General';
      const label = field?.label ?? key;
      let displayVal = '';
      if (val === null || val === undefined) {
        displayVal = '';
      } else if (typeof val === 'object') {
        displayVal = JSON.stringify(val);
      } else {
        displayVal = String(val);
      }
      rows.push([section, label, displayVal]);
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
   * Generates a branded PDF buffer for a club report.
   */
  async generateReportPdf(
    report: ReportWithRelations,
    schema?: ReportSchemaWithFields | null,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Header
        doc.rect(0, 0, doc.page.width, 90).fill('#1A1D2D');

        doc.fillColor('#D81B60').fontSize(11).text('ROTARACT DISTRICT 3011', 40, 25, {
          characterSpacing: 1.5,
        });

        const clubName = report.club?.name ?? 'Club Report';
        doc.fillColor('#FFFFFF').fontSize(18).text(clubName, 40, 42, {
          bold: true,
        } as unknown as Record<string, unknown>);

        const monthStr = report.month ? new Date(report.month).toISOString().slice(0, 7) : '';
        doc.fillColor('#9CA3AF').fontSize(10).text(`Monthly Report • ${monthStr} • RY ${report.ryYear}`, 40, 66);

        // Status Badge
        doc.rect(doc.page.width - 140, 32, 100, 26).fill('#2A2E3D');
        doc.fillColor('#D81B60').fontSize(10).text(report.status.toUpperCase(), doc.page.width - 140, 40, {
          width: 100,
          align: 'center',
        });

        doc.moveDown(4);

        // Metadata box
        const yStart = 110;
        doc.rect(40, yStart, doc.page.width - 80, 50).fillAndStroke('#F9FAFB', '#E5E7EB');
        doc.fillColor('#4B5563').fontSize(9);
        doc.text('Filed On Time:', 55, yStart + 12);
        doc.fillColor('#111827').text(report.filedOnTime ? 'Yes' : 'No', 130, yStart + 12);

        doc.fillColor('#4B5563').text('Submitted At:', 55, yStart + 28);
        doc.fillColor('#111827').text(
          report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : 'Draft',
          130,
          yStart + 28,
        );

        // Sections & Fields
        let currentY = yStart + 75;
        const values = (report.values as Record<string, unknown>) || {};
        const fieldMap = new Map((schema?.fields ?? []).map((f) => [f.fieldKey, f]));

        // Group by section
        const sections = new Map<string, { label: string; value: string }[]>();
        for (const [key, val] of Object.entries(values)) {
          const field = fieldMap.get(key);
          const secName = field?.section || 'General Details';
          if (!sections.has(secName)) sections.set(secName, []);

          let displayVal = '—';
          if (val !== null && val !== undefined) {
            displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          }
          sections.get(secName)!.push({ label: field?.label || key, value: displayVal });
        }

        for (const [secName, items] of sections.entries()) {
          if (currentY > doc.page.height - 80) {
            doc.addPage();
            currentY = 40;
          }

          doc.fillColor('#D81B60').fontSize(12).text(secName, 40, currentY, {
            underline: true,
          } as unknown as Record<string, unknown>);
          currentY += 20;

          for (const item of items) {
            if (currentY > doc.page.height - 60) {
              doc.addPage();
              currentY = 40;
            }

            doc.fillColor('#374151').fontSize(9).text(item.label, 50, currentY, { width: 200 });
            doc.fillColor('#111827').fontSize(9).text(item.value, 260, currentY, { width: 280 });
            currentY += 18;
          }

          currentY += 10;
        }

        // Footer
        doc.fillColor('#9CA3AF').fontSize(8).text(
          `Generated from District 3011 Official Portal on ${new Date().toLocaleString()}`,
          40,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 80 },
        );

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
