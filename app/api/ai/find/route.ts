import { NextRequest, NextResponse } from 'next/server';
import { matchFunds } from '@/lib/aifind';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) {
    return NextResponse.json({ error: '请输入想要的基金描述，例如：稳健的债券基金' }, { status: 400 });
  }

  try {
    const results = await matchFunds(query, 6);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '智能选基失败' },
      { status: 502 },
    );
  }
}
