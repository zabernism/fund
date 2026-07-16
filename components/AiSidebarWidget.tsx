'use client';

import { useState } from 'react';
import AiFundFinder from './AiFundFinder';
import { IconSparkles } from './icons';

/**
 * 悬浮 AI 智能选基（「小人」藏在侧边）
 * - 默认收起为右下角 FAB（带脉冲吸引动画）
 * - 点击展开面板：移动端为底部抽屉，桌面端为右侧浮层
 * - 内部复用 AiFundFinder 的选基逻辑（bare 模式，由本组件负责外壳）
 * 支持受控：传入 open / onOpenChange 即可由外部（如底部导航的「智能」标签）触发开关。
 */
export default function AiSidebarWidget({
  onAddFund,
  existingCodes = [],
  open,
  onOpenChange,
}: {
  onAddFund: (code: string) => void;
  existingCodes?: string[];
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  return (
    <>
      {/* 悬浮 AI 小人（默认收起，脉冲吸引） */}
      <button
        type="button"
        aria-label={isOpen ? '收起 AI 智能选基' : '打开 AI 智能选基'}
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
        className={`fixed bottom-20 right-4 z-[120] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 transition-transform duration-300 hover:scale-105 active:scale-95 sm:bottom-16 sm:right-6 ${
          isOpen ? 'rotate-[12deg] scale-95' : ''
        }`}
      >
        {!isOpen && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" style={{ animationDuration: '2.4s' }} />
        )}
        <IconSparkles width={26} height={26} />
      </button>

      {/* 展开面板 */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[115] bg-black/40 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AI 智能选基"
            className="fixed z-[118] flex max-h-[82vh] flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl bottom-0 inset-x-0 sm:inset-x-auto sm:bottom-16 sm:right-6 sm:w-[400px] sm:max-h-[80vh] sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <IconSparkles width={18} height={18} />
                </span>
                <span className="text-sm font-semibold text-[var(--text)]">AI 智能选基</span>
                <span className="rounded-full bg-[var(--card-hover)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  真实指标匹配
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--card-hover)]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <AiFundFinder
                onAddFund={onAddFund}
                existingCodes={existingCodes}
                variant="desktop"
                bare
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
