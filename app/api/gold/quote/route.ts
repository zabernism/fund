import { NextResponse } from 'next/server';
import { getGoldQuotes } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const gold = await getGoldQuotes();
    return NextResponse.json({ gold });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '黄金行情获取失败' },
      { status: 502 },
    );
  }
}
