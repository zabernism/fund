import { NextResponse } from 'next/server';
import { getFundRank } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { gainers, losers } = await getFundRank();
    return NextResponse.json({ gainers, losers });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '基金排行获取失败' },
      { status: 502 },
    );
  }
}
