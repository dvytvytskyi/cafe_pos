import { NextResponse } from 'next/server';
import { userRepository } from '@/repositories/user.repository';

export async function GET() {
  try {
    const users = await userRepository.findAll();
    const safeUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: user.role.permissions,
      },
      locations: user.locations.map(loc => ({ id: loc.id, name: loc.name })),
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
    }));

    return NextResponse.json(safeUsers, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching staff list:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
      return NextResponse.json({ error: 'Missing required fields: name, pin, and roleId are required.' }, { status: 400 });
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

    return NextResponse.json({
      id: createdUser.id,
      name: createdUser.name,
      role: {
        id: createdUser.role.id,
        name: createdUser.role.name,
        permissions: createdUser.role.permissions,
      },
      locations: createdUser.locations.map(loc => ({ id: loc.id, name: loc.name })),
      position: createdUser.position || '',
      section: createdUser.section || 'Floor',
      nie: createdUser.nie || '',
      phone: createdUser.phone || '',
      email: createdUser.email || '',
      contractStart: createdUser.contractStart || '',
      contractEnd: createdUser.contractEnd || undefined,
      scheduleStart: createdUser.scheduleStart || '10:00',
      scheduleEnd: createdUser.scheduleEnd || '15:00',
      daysPerWeek: createdUser.daysPerWeek || 5,
      avatarInitials: createdUser.avatarInitials || '',
      status: createdUser.status || 'active',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating staff member:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
