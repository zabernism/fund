import { NextRequest, NextResponse } from 'next/server';
import { getFundEstimate } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '基金代码格式不正确（应为 6 位数字）' }, { status: 400 });
  }
  try {
    const data = await getFundEstimate(code);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '获取基金估值失败' }, { status: 502 });
  }
}
