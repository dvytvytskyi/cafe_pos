import { NextResponse } from 'next/server';
import { userRepository, PinDuplicateError } from '@/repositories/user.repository';
import { StaffValidationError } from '@/lib/staff-validation';
import { requirePermission } from '@/lib/auth';

function authErrorResponse(authErr: unknown) {
  const status = (authErr as Error & { status?: number }).status ?? 401;
  return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Unauthorized' }, { status });
}

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
    permissionOverrides: user.permissionOverrides ?? { add: [], remove: [] },
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    try {
      requirePermission(req, 'staff', 'edit');
    } catch (authErr: unknown) {
      return authErrorResponse(authErr);
    }

    const { id } = await params;
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
      permissionOverrides,
    } = body;

    const updatedUser = await userRepository.update(id, {
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
      permissionOverrides,
    });

    return NextResponse.json(formatUser(updatedUser), { status: 200 });
  } catch (error: unknown) {
    if (error instanceof PinDuplicateError) {
      return NextResponse.json({ error: 'PIN_DUPLICATE', code: 'PIN_DUPLICATE' }, { status: 409 });
    }
    if (error instanceof StaffValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating staff member:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PUT(req, ctx);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    try {
      requirePermission(req, 'staff', 'delete');
    } catch (authErr: unknown) {
      return authErrorResponse(authErr);
    }

    const { id } = await params;
    const success = await userRepository.delete(id);
    if (success) {
      return NextResponse.json({ success: true }, { status: 200 });
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting staff member:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
