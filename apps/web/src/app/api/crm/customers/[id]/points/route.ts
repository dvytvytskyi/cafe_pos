import { NextResponse } from 'next/server';
import { crmRepository } from '@/repositories/crm.repository';
import {
  CrmValidationError,
  InsufficientPointsError,
} from '@/lib/crm-validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { pointsDelta, reason } = body;

    if (pointsDelta === undefined || pointsDelta === null) {
      return NextResponse.json({ error: 'pointsDelta is required' }, { status: 400 });
    }

    const delta = typeof pointsDelta === 'number' ? pointsDelta : parseFloat(String(pointsDelta));
    if (!Number.isFinite(delta)) {
      return NextResponse.json({ error: 'pointsDelta must be a number' }, { status: 400 });
    }

    const updatedCustomer = await crmRepository.applyPointsAdjustment(
      id,
      delta,
      typeof reason === 'string' ? reason : undefined
    );

    return NextResponse.json(updatedCustomer, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InsufficientPointsError) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_POINTS', code: 'INSUFFICIENT_POINTS' },
        { status: 409 }
      );
    }
    if (error instanceof CrmValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error adjusting customer points:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
