import { NextResponse } from 'next/server';
import {
  timeCardRepository,
  NotClockedInError,
} from '@/repositories/timecard.repository';
import { userRepository } from '@/repositories/user.repository';
import { deriveTimeEntryStatus } from '@/lib/timecard-validation';

function formatCard(card: Awaited<ReturnType<typeof timeCardRepository.clockOut>>) {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, pin } = body as { userId?: string; pin?: string };

    let targetUserId = userId;
    if (!targetUserId && pin) {
      const user = await userRepository.findByPin(pin);
      if (!user) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId or pin is required' }, { status: 400 });
    }

    const card = await timeCardRepository.clockOut(targetUserId);
    return NextResponse.json(formatCard(card), { status: 200 });
  } catch (error: unknown) {
    if (error instanceof NotClockedInError) {
      return NextResponse.json({ error: 'NOT_CLOCKED_IN', code: 'NOT_CLOCKED_IN' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error clocking out:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
