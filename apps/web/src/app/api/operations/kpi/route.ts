import { NextResponse } from 'next/server';
import {
  operationsKpiRepository,
  ShiftNotFoundError,
} from '@/repositories/operations-kpi.repository';
import {
  OperationsKpiValidationError,
  validateKpiQuery,
} from '@/lib/operations-kpi';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { date, shiftId } = validateKpiQuery(
      searchParams.get('date'),
      searchParams.get('shiftId')
    );

    const kpi = await operationsKpiRepository.getKpi(date, shiftId);
    return NextResponse.json(kpi, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof OperationsKpiValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ShiftNotFoundError) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching operations KPI:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
