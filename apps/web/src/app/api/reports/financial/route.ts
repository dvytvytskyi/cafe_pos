import { NextResponse } from 'next/server';
import { reportsRepository } from '@/repositories/reports.repository';
import {
  ReportsFinancialValidationError,
  parseFinancialReportFilters,
} from '@/lib/reports-financial-validation';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = parseFinancialReportFilters(searchParams);
    const report = await reportsRepository.getFinancialReport(filters);
    return NextResponse.json(report, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ReportsFinancialValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/reports/financial error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
