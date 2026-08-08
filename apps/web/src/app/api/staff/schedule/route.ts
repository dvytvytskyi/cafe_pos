import { NextResponse } from 'next/server';
import { scheduleRepository } from '@/repositories/schedule.repository';
import {
  ScheduleValidationError,
  OverlappingShiftError,
  parseWeekStart,
  calcWeeklyHours,
  hasWeeklyHoursWarning,
} from '@/lib/schedule-validation';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get('weekStart');
    if (!weekStartParam) {
      return NextResponse.json({ error: 'weekStart query param is required' }, { status: 400 });
    }

    const weekStart = parseWeekStart(weekStartParam);
    const shifts = await scheduleRepository.findByWeek(weekStart);

    const warnings = [...new Set(shifts.map((s) => s.userId))]
      .filter((userId) =>
        hasWeeklyHoursWarning(
          shifts.map((s) => ({
            userId: s.userId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
          userId
        )
      )
      .map((userId) => {
        const user = shifts.find((s) => s.userId === userId)?.user;
        return {
          userId,
          userName: user?.name ?? userId,
          weeklyHours: calcWeeklyHours(
            shifts.map((s) => ({
              userId: s.userId,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            })),
            userId
          ),
        };
      });

    return NextResponse.json(
      {
        weekStart: weekStartParam,
        shifts: shifts.map((s) => ({
          id: s.id,
          userId: s.userId,
          userName: s.user.name,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        warnings,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof ScheduleValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
