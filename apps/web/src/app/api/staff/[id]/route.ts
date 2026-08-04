import { NextResponse } from 'next/server';
import { userRepository } from '@/repositories/user.repository';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      role: {
        id: updatedUser.role.id,
        name: updatedUser.role.name,
        permissions: updatedUser.role.permissions,
      },
      locations: updatedUser.locations.map(loc => ({ id: loc.id, name: loc.name })),
      position: updatedUser.position || '',
      section: updatedUser.section || 'Floor',
      nie: updatedUser.nie || '',
      phone: updatedUser.phone || '',
      email: updatedUser.email || '',
      contractStart: updatedUser.contractStart || '',
      contractEnd: updatedUser.contractEnd || undefined,
      scheduleStart: updatedUser.scheduleStart || '10:00',
      scheduleEnd: updatedUser.scheduleEnd || '15:00',
      daysPerWeek: updatedUser.daysPerWeek || 5,
      avatarInitials: updatedUser.avatarInitials || '',
      status: updatedUser.status || 'active',
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating staff member:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = await userRepository.delete(id);
    if (success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error deleting staff member:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
