import { NextResponse } from 'next/server';
import { menuRepository } from '@/repositories/menu.repository';
import { MenuValidationError } from '@/lib/menu-validation';
import { GUEST_SUPPORTED_LOCALES } from '@/lib/guest-constants';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const translations = await menuRepository.listMenuItemTranslations(id);
    return NextResponse.json(translations, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const locale = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : '';
    if (!locale || !(GUEST_SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const translation = await menuRepository.upsertMenuItemTranslation(id, locale, {
      name: body.name,
      description: body.description,
    });
    return NextResponse.json(translation, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof MenuValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale');
    if (!locale) {
      return NextResponse.json({ error: 'locale query parameter is required' }, { status: 400 });
    }
    await menuRepository.deleteMenuItemTranslation(id, locale);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
