import { NextRequest, NextResponse } from 'next/server';
import { getSectorList } from '@/lib/finance';
import type { SectorType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type: SectorType =
    searchParams.get('type') === 'concept' ? 'concept' : 'industry';
  const q = searchParams.get('q') || undefined;
  try {
    const sectors = await getSectorList(type, q);
    return NextResponse.json({ sectors });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || '板块列表获取失败' },
      { status: 502 },
    );
  }
}
