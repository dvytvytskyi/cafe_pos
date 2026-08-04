import { NextResponse } from 'next/server';
import { crmRepository } from '@/repositories/crm.repository';

export async function GET() {
  try {
    const config = await crmRepository.getLoyaltyConfig();
    return NextResponse.json(config, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching loyalty configuration:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      bronzeRate,
      silverRate,
      goldRate,
      vipRate,
      silverThreshold,
      goldThreshold,
      vipThreshold,
    } = body;

    const savedConfig = await crmRepository.saveLoyaltyConfig({
      bronzeRate,
      silverRate,
      goldRate,
      vipRate,
      silverThreshold,
      goldThreshold,
      vipThreshold,
    });

    return NextResponse.json(savedConfig, { status: 200 });

  } catch (error: any) {
    console.error('Error saving loyalty configuration:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
