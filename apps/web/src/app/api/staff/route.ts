import { NextResponse } from 'next/server';
import { userRepository, PinDuplicateError } from '@/repositories/user.repository';
import { StaffValidationError } from '@/lib/staff-validation';
import { requirePermission, getSessionFromRequest } from '@/lib/auth';
import {
  assertStaffLocationAssignment,
  filterByLocationScope,
  getAccessibleLocationIds,
  isGeneralTeamMember,
} from '@/lib/location-scope';

type UserWithRelations = Awaited<ReturnType<typeof userRepository.findById>>;

function formatUser(user: NonNullable<UserWithRelations>) {
  return {
    id: user.id,
    name: user.name,
    roleId: user.role.id,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions,
    },
    locations: user.locations.map((loc) => ({ id: loc.id, name: loc.name })),
    position: user.position || '',
    section: user.section || 'Floor',
    nie: user.nie || '',
    phone: user.phone || '',
    email: user.email || '',
    contractStart: user.contractStart || '',
    contractEnd: user.contractEnd || undefined,
    scheduleStart: user.scheduleStart || '10:00',
    scheduleEnd: user.scheduleEnd || '15:00',
    daysPerWeek: user.daysPerWeek || 5,
    avatarInitials: user.avatarInitials || '',
    status: user.status || 'active',
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search') ?? undefined;
    const statusParam = searchParams.get('status');
    const status =
      statusParam === 'active' || statusParam === 'inactive' || statusParam === 'all'
        ? statusParam
        : undefined;

    const paginated = pageParam !== null || limitParam !== null;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const result = await userRepository.findAll({
      page: paginated ? page : 1,
      limit: paginated ? limit : 100,
      search,
      status,
    });

    const session = getSessionFromRequest(req);
    let items = result.items;
    if (session) {
      const access = getAccessibleLocationIds(session);
      items = filterByLocationScope(
        items,
        (user) => user.locations.map((l) => l.id),
        access
      );
      // Location admins also see general team (read-only at UI layer)
      if (access !== 'all') {
        const general = result.items.filter((u) => isGeneralTeamMember(u.locations.map((l) => l.id)));
        const ids = new Set(items.map((u) => u.id));
        for (const g of general) {
          if (!ids.has(g.id)) items.push(g);
        }
      }
    }

    const safeUsers = items.map((user) => formatUser(user));

    if (paginated) {
      return NextResponse.json(
        { items: safeUsers, total: result.total, page: result.page, limit: result.limit },
        { status: 200 }
      );
    }

    return NextResponse.json(safeUsers, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching staff list:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    try {
      requirePermission(req, 'staff', 'create');
    } catch (authErr: unknown) {
      const status = (authErr as Error & { status?: number }).status ?? 401;
      return NextResponse.json(
        { error: status === 403 ? 'Forbidden' : 'Unauthorized' },
        { status }
      );
    }

    const body = await req.json();
    const {
      name,
      pin,
      roleId,
      locationIds,
      position,
      section,
      nie,
      phone,
      email,
      contractStart,
      contractEnd,
      scheduleStart,
      scheduleEnd,
      daysPerWeek,
      avatarInitials,
      status,
    } = body;

    if (!name || !pin || !roleId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, pin, and roleId are required.' },
        { status: 400 }
      );
    }

    const session = getSessionFromRequest(req);
    if (session) {
      assertStaffLocationAssignment(session, locationIds);
      if (isGeneralTeamMember(locationIds) && session.roleName !== 'Super Admin') {
        return NextResponse.json(
          { error: 'Only Super Admin can create general team members' },
          { status: 403 }
        );
      }
    }

    const createdUser = await userRepository.create({
      name,
      pin,
      roleId,
      locationIds,
      position,
      section,
      nie,
      phone,
      email,
      contractStart,
      contractEnd,
      scheduleStart,
      scheduleEnd,
      daysPerWeek,
      avatarInitials,
      status,
    });

    return NextResponse.json(formatUser(createdUser), { status: 201 });
  } catch (error: unknown) {
    if (error instanceof PinDuplicateError) {
      return NextResponse.json({ error: 'PIN_DUPLICATE', code: 'PIN_DUPLICATE' }, { status: 409 });
    }
    if (error instanceof StaffValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating staff member:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
