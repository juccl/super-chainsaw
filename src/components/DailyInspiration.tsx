import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage';

const STORAGE_KEY = 'business-dashboard:daily-inspiration:collapsed-v1';

const inspirationList = [
  '今天多看一眼波动，明天少一次误判。',
  '数据不是答案，但能帮你更快接近答案。',
  '别只看结果，先看变化从哪里开始。',
  '好的渠道不是单次爆发，而是持续稳定。',
  'D1 看质量，D4 看承接，转化看整体链路。',
  '指标不会说谎，但需要放在业务场景里看。',
  '先判断趋势，再判断动作。',
  '不要被单个高点迷惑，稳定性才是长期价值。',
  '复盘不是追责，是为了更快找到下一步。',
  '经营看板的价值，是把波动变成可判断的信号。',
  '先看大盘，再看个人，最后看渠道。',
  '数据异常不一定是坏事，它可能是新机会的入口。',
  '好的经营动作，来自清晰的指标口径。',
  '每一次筛选，都是一次业务假设验证。',
  '指标要能解释行动，否则只是数字堆叠。',
  '先看规模，再看效率，最后看稳定性。',
  '高 ROI 值得关注，低波动更值得复盘。',
  '渠道质量，要看首日，也要看转化日。',
  '别只看今天好不好，要看这个趋势能不能持续。',
  '让数据沉淀成判断，让判断沉淀成动作。',
];

export function DailyInspiration() {
  const [collapsed, setCollapsed] = useState<boolean>(() => readStorage(STORAGE_KEY, false));
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => writeStorage(STORAGE_KEY, collapsed), [collapsed]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const dateKey = useMemo(
    () =>
      new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now),
    [now],
  );
  const text = useMemo(() => {
    const seed = hash(dateKey);
    return inspirationList[seed % inspirationList.length];
  }, [dateKey]);

  if (collapsed) {
    return (
      <section className="panel mb-4 bg-gradient-to-r from-[#eef5ff] via-white to-[#effdf8] px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Sparkles size={15} className="text-primary" />
            每日灵感
          </div>
          <button type="button" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700" onClick={() => setCollapsed(false)}>
            展开
            <ChevronDown size={14} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel mb-4 bg-gradient-to-r from-[#eef5ff] via-white to-[#effdf8] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white text-primary">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-500">每日灵感</div>
            <div className="mt-1 text-sm font-medium text-slate-700">{text}</div>
          </div>
        </div>
        <button type="button" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700" onClick={() => setCollapsed(true)}>
          收起
          <ChevronUp size={14} />
        </button>
      </div>
    </section>
  );
}

function hash(input: string): number {
  let value = 0;
  for (let i = 0; i < input.length; i += 1) value = (value * 31 + input.charCodeAt(i)) >>> 0;
  return value;
}
