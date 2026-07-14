import { NextRequest, NextResponse } from 'next/server';
import { getSectorQuotes } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const codes = (searchParams.get('codes') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (codes.length === 0) return NextResponse.json({ sectors: [] });
  try {
    const sectors = await getSectorQuotes(codes);
    return NextResponse.json({ sectors });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '板块行情获取失败' },
      { status: 502 },
    );
  }
}
