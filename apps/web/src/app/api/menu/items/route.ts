import { NextResponse } from 'next/server';
import { menuRepository } from '@/repositories/menu.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, price, categoryId, allergens } = body;

    if (!name || price === undefined || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields: name, price, and categoryId are required' }, { status: 400 });
    }

    const createdItem = await menuRepository.createMenuItem({
      name,
      description,
      price,
      categoryId,
      allergens,
    });

    return NextResponse.json(createdItem, { status: 201 });

  } catch (error: any) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
