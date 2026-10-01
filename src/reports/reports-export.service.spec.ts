import { describe, it, expect, beforeEach } from 'vitest';
import { ReportsExportService } from './reports-export.service';
import type { ReportWithRelations } from './reports.types';

describe('ReportsExportService', () => {
  let service: ReportsExportService;

  beforeEach(() => {
    service = new ReportsExportService();
  });

  describe('parseIfJson & formatValue', () => {
    it('parses stringified JSON and flattens it', () => {
      const raw = '[{"status": "OK", "amount": 100}]';
      const parsed = service.parseIfJson(raw);
      expect(Array.isArray(parsed)).toBe(true);

      const formatted = service.formatValue(raw);
      expect(formatted).not.toContain('[{"');
      expect(formatted).toContain('Status: OK');
      expect(formatted).toContain('Amount: 100');
    });

    it('formats objects cleanly into key-value lines', () => {
      const obj = { totalDonations: 5000, currency: 'INR' };
      const formatted = service.formatValue(obj);
      expect(formatted).toContain('Total Donations: 5000');
      expect(formatted).toContain('Currency: INR');
    });

    it('handles booleans, dates and primitives', () => {
      expect(service.formatValue(true)).toBe('Yes');
      expect(service.formatValue(false)).toBe('No');
      expect(service.formatValue(null)).toBe('—');
      expect(service.formatValue(undefined)).toBe('—');
      expect(service.formatValue(['Delhi Central', 'Delhi South'])).toBe('Delhi Central, Delhi South');
    });
  });

  describe('generateReportCsv', () => {
    it('generates a CSV with clean General Details and an Activities child-table without raw JSON', () => {
      const mockReport: ReportWithRelations = {
        id: 'rep-1234567890abcdef',
        clubId: 'club-1',
        ryYear: 2026,
        month: new Date('2026-09-01'),
        status: 'approved',
        filedOnTime: true,
        submittedAt: new Date('2026-09-10T12:00:00Z'),
        notes: 'Monthly report notes',
        schemaId: 'schema-1',
        scoreTotal: 220,
        club: {
          id: 'club-1',
          name: 'Rotaract Club of Delhi Central',
          shortName: 'RAC Delhi Central',
          zone: 'Zone 1',
        },
        values: {
          physical_meetings: 4,
          virtual_meetings: 2,
          general_status: '[{"status": "OK", "amount": 500}]',
          activities: [
            {
              activity_title: 'Mega Blood Donation Camp',
              activity_date: '2026-09-05',
              avenue: 'community',
              area_of_focus: 'Disease prevention and treatment',
              is_physical: true,
              initiated_by: 'rotaract',
              members_participated: 25,
              people_reached: 120,
              collaborating_clubs: ['RAC Delhi Elite', 'RAC Connaught Place'],
              photo_links: ['https://photos.app.goo.gl/example'],
              showcase_summary: 'Collected 100 units of blood in partnership with Red Cross.',
            },
          ],
        },
      } as unknown as ReportWithRelations;

      const csv = service.generateReportCsv(mockReport);

      expect(csv).toContain('District 3011 - Club Monthly Report');
      expect(csv).toContain('Rotaract Club of Delhi Central');
      expect(csv).toContain('--- GENERAL DETAILS ---');
      expect(csv).toContain('Physical meetings');
      expect(csv).toContain('Status: OK | Amount: 500');
      expect(csv).not.toContain('[{"status"');

      // Check Activities Child-Table
      expect(csv).toContain('--- ACTIVITIES ---');
      expect(csv).toContain('Mega Blood Donation Camp');
      expect(csv).toContain('Community');
      expect(csv).toContain('In-Person');
      expect(csv).toContain('120');
      expect(csv).toContain('RAC Delhi Elite, RAC Connaught Place');
      expect(csv).toContain('Collected 100 units of blood');
    });
  });

  describe('generateReportPdf', () => {
    it('generates a valid PDF buffer with formatted sections', async () => {
      const mockReport: ReportWithRelations = {
        id: 'rep-1234567890abcdef',
        clubId: 'club-1',
        ryYear: 2026,
        month: new Date('2026-09-01'),
        status: 'approved',
        filedOnTime: true,
        submittedAt: new Date('2026-09-10T12:00:00Z'),
        notes: 'Monthly report notes',
        schemaId: 'schema-1',
        scoreTotal: 220,
        club: {
          id: 'club-1',
          name: 'Rotaract Club of Delhi Central',
          shortName: 'RAC Delhi Central',
          zone: 'Zone 1',
        },
        values: {
          physical_meetings: 4,
          general_summary: '[{"status": "Completed", "verified": true}]',
          activities: [
            {
              activity_title: 'Tree Plantation Drive',
              activity_date: '2026-09-12',
              avenue: 'community',
              members_participated: 15,
              people_reached: 50,
              showcase_summary: 'Planted 100 saplings in Nehru Park.',
            },
          ],
        },
      } as unknown as ReportWithRelations;

      const pdfBuffer = await service.generateReportPdf(mockReport);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      // PDF magic bytes %PDF-
      expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
    });
  });
});
