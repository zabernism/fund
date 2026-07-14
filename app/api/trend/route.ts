import { NextRequest, NextResponse } from 'next/server';
import { getTrend } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secids = (searchParams.get('secids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (secids.length === 0) return NextResponse.json({ trends: {} });
  try {
    const trends = await getTrend(secids);
    return NextResponse.json({ trends });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '分时数据获取失败' },
      { status: 502 },
    );
  }
}
