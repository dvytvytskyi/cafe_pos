import { NextResponse } from 'next/server';
import { crmRepository } from '@/repositories/crm.repository';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, birthday, allergyNotes, notes, favoriteDishes, points, tier } = body;

    const updatedCustomer = await crmRepository.updateCustomer(id, {
      name,
      phone,
      email,
      birthday,
      allergyNotes,
      notes,
      favoriteDishes,
      points,
      tier,
    });

    return NextResponse.json(updatedCustomer, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating customer [${req.url}]:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
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
