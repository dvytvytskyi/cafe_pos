export class ReportsFinancialValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportsFinancialValidationError';
  }
}

export type FinancialReportFilters = {
  locationId: string;
  startDate: Date;
  endDate: Date;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function parseIsoDate(value: string, label: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ReportsFinancialValidationError(`Invalid ${label} date format`);
  }
  return d;
}

export function parseFinancialReportFilters(searchParams: URLSearchParams): FinancialReportFilters {
  const locationId = searchParams.get('locationId')?.trim() || 'default';

  const startRaw = searchParams.get('startDate');
  const endRaw = searchParams.get('endDate');
  if (!startRaw || !endRaw) {
    throw new ReportsFinancialValidationError('startDate and endDate are required');
  }

  const startDate = startOfDay(parseIsoDate(startRaw, 'startDate'));
  let endDate = endOfDay(parseIsoDate(endRaw, 'endDate'));
  const todayEnd = endOfDay(new Date());
  if (endDate.getTime() > todayEnd.getTime()) {
    endDate = todayEnd;
  }

  if (startDate.getTime() > endDate.getTime()) {
    throw new ReportsFinancialValidationError('startDate must be before or equal to endDate');
  }

  return { locationId, startDate, endDate };
}
