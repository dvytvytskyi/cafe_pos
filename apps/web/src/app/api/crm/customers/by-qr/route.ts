import { NextResponse } from 'next/server';
import { crmRepository } from '@/repositories/crm.repository';
import { CrmValidationError, parseCustomerQrCode } from '@/lib/crm-validation';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'code query parameter is required' }, { status: 400 });
    }

    const customerId = parseCustomerQrCode(code);
    const customer = await crmRepository.findById(customerId);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CrmValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error resolving customer by QR:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
