import { NextResponse } from 'next/server';
import { crmRepository } from '@/repositories/crm.repository';

export async function GET() {
  try {
    const customers = await crmRepository.getCustomers();
    return NextResponse.json(customers, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, birthday, allergyNotes, notes } = body;

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields: name, phone, and email are required' }, { status: 400 });
    }

    const createdCustomer = await crmRepository.createCustomer({
      name,
      phone,
      email,
      birthday,
      allergyNotes,
      notes,
    });

    return NextResponse.json(createdCustomer, { status: 201 });

  } catch (error: any) {
    console.error('Error creating customer profile:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
