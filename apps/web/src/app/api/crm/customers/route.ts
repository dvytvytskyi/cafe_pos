import { NextResponse } from 'next/server';
import { crmRepository } from '@/repositories/crm.repository';
import {
  CrmValidationError,
  PhoneDuplicateError,
  parseSortField,
  parseSortOrder,
  validatePaginationParams,
} from '@/lib/crm-validation';

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search') ?? undefined;
    const sortBy = parseSortField(searchParams.get('sortBy'));
    const sortOrder = parseSortOrder(searchParams.get('sortOrder'));

    const paginated = pageParam !== null || limitParam !== null;

    if (paginated) {
      const { page, limit } = validatePaginationParams(
        pageParam ? parseInt(pageParam, 10) : 1,
        limitParam ? parseInt(limitParam, 10) : 20
      );

      const result = await crmRepository.findAll({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });

      return NextResponse.json(
        {
          items: result.items,
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
        { status: 200 }
      );
    }

    const result = await crmRepository.findAll({ limit: 100, search, sortBy, sortOrder });
    return NextResponse.json(result.items, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CrmValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, birthday, allergyNotes, notes } = body;

    if (!name || !phone || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, and email are required' },
        { status: 400 }
      );
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
  } catch (error: unknown) {
    console.error('Error creating customer profile:', error);
    return handleCrmError(error);
  }
}
