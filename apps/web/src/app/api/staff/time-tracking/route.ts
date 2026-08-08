import { NextResponse } from 'next/server';
import { timeCardRepository } from '@/repositories/timecard.repository';
import { TimeCardValidationError, parseDateParam, deriveTimeEntryStatus } from '@/lib/timecard-validation';

function formatCard(card: Awaited<ReturnType<typeof timeCardRepository.findByWorkDate>>[number]) {
  return {
    id: card.id,
    employeeId: card.userId,
    employeeName: card.user.name,
    date: card.workDate.toISOString().slice(0, 10),
    checkInTime: card.clockIn.toISOString(),
    checkOutTime: card.clockOut?.toISOString() ?? null,
    totalHours: card.totalMinutes / 60,
    totalMinutes: card.totalMinutes,
    status: deriveTimeEntryStatus(card.clockIn, card.clockOut ?? null),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (fromParam && toParam) {
      const from = parseDateParam(fromParam);
      const to = parseDateParam(toParam);
      const cards = await timeCardRepository.findByDateRange(from, to);
      return NextResponse.json(cards.map(formatCard), { status: 200 });
    }

    const date = dateParam ? parseDateParam(dateParam) : new Date();
    const cards = await timeCardRepository.findByWorkDate(date);
    return NextResponse.json(cards.map(formatCard), { status: 200 });
  } catch (error: unknown) {
    if (error instanceof TimeCardValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching time tracking:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
