import { NextResponse } from 'next/server';
import { crmRepository } from '@/repositories/crm.repository';
import { PhoneDuplicateError, CrmValidationError } from '@/lib/crm-validation';
import { prisma } from '@/lib/db';

function handleCrmError(error: unknown) {
  if (error instanceof PhoneDuplicateError) {
    return NextResponse.json({ error: 'PHONE_DUPLICATE', code: 'PHONE_DUPLICATE' }, { status: 409 });
  }
  if (error instanceof CrmValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, birthday, allergyNotes, notes, favoriteDishes, tier } = body;

    const updatedCustomer = await crmRepository.updateCustomer(id, {
      name,
      phone,
      email,
      birthday,
      allergyNotes,
      notes,
      favoriteDishes,
      tier,
    });

    return NextResponse.json(updatedCustomer, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error updating customer [${req.url}]:`, error);
    return handleCrmError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting customer:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
