import { NextResponse } from 'next/server';
import { getIndexQuotes } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const indices = await getIndexQuotes();
    return NextResponse.json({ indices });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '获取大盘行情失败' }, { status: 502 });
  }
}
