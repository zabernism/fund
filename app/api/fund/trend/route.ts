import { NextRequest, NextResponse } from 'next/server';
import { getFundTrend } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim();
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: 'code 需为 6 位基金代码' },
      { status: 400 },
    );
  }
  try {
    const data = await getFundTrend(code);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '获取基金走势失败' },
      { status: 502 },
    );
  }
}
