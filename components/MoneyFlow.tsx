'use client';

/**
 * 实时资金流向（北向资金）占位卡。
 *
 * 项目目前没有真实的北向资金接口，因此这里只做清晰标注的占位展示，
 * 绝对不编造任何实时数字冒充真实数据。待主 agent 接入真实数据源后，
 * 可在此组件内替换数据，props 可保持为空（或按需扩展）。
 */
export default function MoneyFlow() {
  return (
    <section className="glass overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">实时资金流向</h2>
        </div>
        <span className="rounded bg-[var(--card-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
          北向资金 · 占位
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[var(--border-strong)] spin" />
          <div className="absolute inset-2 rounded-full border border-[var(--border)]" />
        </div>
        <div>
          <div className="font-mono-data text-2xl font-bold leading-none text-[var(--muted)]">
            —
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">等待数据源接入</div>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--muted)]">沪股通</span>
          <span className="font-mono-data text-[var(--muted)]">—</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--muted)]">深股通</span>
          <span className="font-mono-data text-[var(--muted)]">—</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
        项目暂未接入北向资金实时接口，此处为占位展示，不显示任何模拟数值。
      </p>
    </section>
  );
}
