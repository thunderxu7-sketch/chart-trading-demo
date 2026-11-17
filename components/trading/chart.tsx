'use client';
import { useEffect, useMemo, useRef } from 'react';
import { CandlestickSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import type { Candle } from '@/lib/types';
import { aggregateCandles } from '@/lib/candles';
export default function Chart({ candles, interval }: { candles: Candle[]; interval: number }) {
  const container = useRef<HTMLDivElement>(null), series = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const lastInterval = useRef<number | null>(null);
  const data = useMemo(() => aggregateCandles(candles, interval).map(c => ({ ...c, time: c.time as UTCTimestamp })), [candles, interval]);
  useEffect(() => {
    if (!container.current) return;
    // Trade-off: Canvas/ResizeObserver require a browser. Only this leaf disables
    // SSR; the public history summary remains HTML in the parent RSC.
    const chart = createChart(container.current, {
      autoSize: true, layout: { background: { type: ColorType.Solid, color: '#101519' }, textColor: '#7f939e', fontFamily: 'ui-monospace, monospace', fontSize: 11, attributionLogo: true },
      grid: { vertLines: { color: '#1a242a' }, horzLines: { color: '#1a242a' } },
      rightPriceScale: { borderColor: '#26333a' }, timeScale: { borderColor: '#26333a', timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { color: '#4b6a6a' }, horzLine: { color: '#4b6a6a' } }
    });
    chartApi.current = chart;
    series.current = chart.addSeries(CandlestickSeries, { upColor: '#76e0b4', downColor: '#f18a94', borderVisible: false, wickUpColor: '#76e0b4', wickDownColor: '#f18a94' });
    series.current.setData(data); chart.timeScale().fitContent(); lastInterval.current = interval;
    return () => { series.current = null; chartApi.current = null; chart.remove(); lastInterval.current = null; };
    // Initialize once. Later feed frames update the last bar without resetting zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!series.current || !data.length) return;
    if (lastInterval.current !== interval) { series.current.setData(data); chartApi.current?.timeScale().fitContent(); lastInterval.current = interval; }
    else series.current.update(data.at(-1)!);
  }, [data,interval]);
  return <div ref={container} className="chart-canvas" role="img" aria-label={`ETH / mUSD ${interval} 分钟演示 K 线`} data-testid="chart" />;
}
