'use client';

import { useId } from 'react';
import type { TrendData } from '@/lib/types';

export default function Sparkline({
  trend,
  width = 76,
  height = 28,
  baseline,
  responsive = false,
  fill = false,
  strokeWidth = 1.5,
}: {
  trend?: TrendData | null;
  width?: number;
  height?: number;
  /** 额外参考线（如持仓成本价），画为琥珀色虚线 */
  baseline?: number | null;
  /** 自适应宽度（拉伸填满父容器），用于展开的走势图 */
  responsive?: boolean;
  /** 面积渐变填充（桌面端展开走势用） */
  fill?: boolean;
  strokeWidth?: number;
}) {
  const gid = useId().replace(/:/g, '');

  if (!trend || trend.points.length < 2) {
    return <div style={{ width, height }} className="shrink-0" />;
  }
  const prices = trend.points.map((p) => p.price);
  const ref = trend.prevClose ?? prices[0];
  const min = Math.min(...prices, ref, baseline ?? ref);
  const max = Math.max(...prices, ref, baseline ?? ref);
  const range = max - min || 1;

  const x = (i: number) => (i / (prices.length - 1)) * width;
  const y = (v: number) => height - ((v - min) / range) * (height - 2) - 1;

  const linePath = prices
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ');

  const last = prices[prices.length - 1];
  const up = last >= ref;
  const color = up ? '#ef4444' : '#10b981';
  const baseY = y(ref);

  return (
    <svg
      width={responsive ? '100%' : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={responsive ? 'none' : 'xMidYMid meet'}
      className="shrink-0"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <linearGradient id={`grad-${gid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {trend.prevClose != null && (
        <line
          x1={0}
          x2={width}
          y1={baseY}
          y2={baseY}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
      {baseline != null && (
        <line
          x1={0}
          x2={width}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
      )}

      {fill && (
        <path
          d={`${linePath} L${width},${height} L0,${height} Z`}
          fill={`url(#grad-${gid})`}
          stroke="none"
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
