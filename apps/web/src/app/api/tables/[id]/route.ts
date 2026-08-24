import { NextResponse } from 'next/server';
import { tableRepository } from '@/repositories/table.repository';
import { TABLE_STATUSES } from '@/lib/constants';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { status, assignedStaffId } = body as {
      status?: string;
      assignedStaffId?: string | null;
    };

    if (status !== undefined && !TABLE_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: 'INVALID_STATUS',
          message: `status must be one of: ${TABLE_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (status === undefined && assignedStaffId === undefined) {
      return NextResponse.json(
        { error: 'INVALID_BODY', message: 'Provide status or assignedStaffId' },
        { status: 400 }
      );
    }

    const updated = await tableRepository.updateTable(id, {
      status,
      assignedStaffId,
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'TABLE_NOT_FOUND', message: `Table [${id}] not found` },
        { status: 404 }
      );
    }
    console.error(`Error updating table [${id}]:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    );
  }
}
