import { NextResponse } from 'next/server';
import { menuRepository } from '@/repositories/menu.repository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const categories = await menuRepository.getCategories(includeArchived);
    return NextResponse.json(categories, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching menu categories:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const createdCategory = await menuRepository.createCategory(name);
    return NextResponse.json(createdCategory, { status: 201 });

  } catch (error: any) {
    console.error('Error creating menu category:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
