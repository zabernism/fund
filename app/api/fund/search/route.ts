import { NextRequest, NextResponse } from 'next/server';
import { getFundSearch } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ results: [] });
  try {
    const results = await getFundSearch(q);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '基金搜索失败' }, { status: 502 });
  }
}
