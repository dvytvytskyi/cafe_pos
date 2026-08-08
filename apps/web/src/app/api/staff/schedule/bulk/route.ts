import { NextResponse } from 'next/server';
import {
  scheduleRepository,
  ScheduleValidationError,
  OverlappingShiftError,
} from '@/repositories/schedule.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { weekStart, shifts } = body as {
      weekStart?: string;
      shifts?: Array<{ userId: string; dayOfWeek: number; startTime: string; endTime: string }>;
    };

    if (!weekStart || !Array.isArray(shifts)) {
      return NextResponse.json({ error: 'weekStart and shifts array are required' }, { status: 400 });
    }

    const saved = await scheduleRepository.bulkSave(weekStart, shifts);
    return NextResponse.json(
      {
        weekStart,
        count: saved.length,
        shifts: saved.map((s) => ({
          id: s.id,
          userId: s.userId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof OverlappingShiftError) {
      return NextResponse.json({ error: error.message, code: 'OVERLAPPING_SHIFT' }, { status: 400 });
    }
    if (error instanceof ScheduleValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error bulk saving schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
