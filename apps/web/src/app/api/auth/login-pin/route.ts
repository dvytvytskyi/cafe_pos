import { NextResponse } from 'next/server';
import { userRepository } from '@/repositories/user.repository';

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    if (!pin) {
      return NextResponse.json({ error: 'PIN code is required' }, { status: 400 });
    }

    const user = await userRepository.findByPin(pin);
    if (!user) {
      return NextResponse.json({ error: 'Invalid PIN code' }, { status: 401 });
    }

    // Return safe user details (exclude pinHash)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: {
          id: user.role.id,
          name: user.role.name,
          permissions: user.role.permissions,
        },
        locations: user.locations.map(loc => ({ id: loc.id, name: loc.name })),
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in login-pin route:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
