'use client';

import React, { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { CheckSquare, ListTodo, RefreshCw } from 'lucide-react';
import { getOperationsKpiAsync } from '@/lib/operations-kpi-client';
import type { OperationsKpiPayload } from '@/lib/operations-kpi';
import { getCurrentShiftAsync } from '@/lib/shifts';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';

export type OperationsKpiBarHandle = {
  refresh: () => Promise<void>;
};

type OperationsKpiBarProps = {
  className?: string;
};

const OperationsKpiBar = forwardRef<OperationsKpiBarHandle, OperationsKpiBarProps>(
  function OperationsKpiBar({ className = '' }, ref) {
    const [kpi, setKpi] = useState<OperationsKpiPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
      try {
        setError(null);
        const shift = await getCurrentShiftAsync(DEFAULT_LOCATION_ID).catch(() => null);
        const data = await getOperationsKpiAsync(new Date(), shift?.id);
        setKpi(data);
      } catch (err) {
        console.error('Failed to load operations KPI:', err);
        setError(err instanceof Error ? err.message : 'Failed to load KPI');
      } finally {
        setIsLoading(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({ refresh: load }), [load]);

    useEffect(() => {
      void load();
    }, [load]);

    if (isLoading && !kpi) {
      return (
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 ${className}`} data-testid="operations-kpi-loading">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse" />
          ))}
        </div>
      );
    }

    const tasks = kpi?.tasks;
    const checklists = kpi?.checklists;

    return (
      <div className={`mb-6 ${className}`}>
        {error && (
          <div role="alert" className="mb-3 bg-red-50 border border-red-100 text-red-700 text-[13px] font-medium rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="operations-kpi-bar">
          <KpiCard
            testId="kpi-tasks-percent"
            label="Tasks Done"
            value={tasks?.isEmpty ? '—' : `${tasks?.completionPercent ?? 0}%`}
            sub={tasks?.isEmpty ? 'No tasks today' : `${tasks?.completed ?? 0}/${tasks?.total ?? 0} completed`}
            icon={<ListTodo size={16} />}
            accent="bg-blue-500"
            progress={tasks?.completionPercent ?? 0}
          />
          <KpiCard
            testId="kpi-tasks-total"
            label="Tasks Today"
            value={String(tasks?.total ?? 0)}
            sub={tasks?.isEmpty ? 'Empty board' : `${tasks?.completed ?? 0} finished`}
            icon={<ListTodo size={16} />}
            accent="bg-indigo-500"
          />
          <KpiCard
            testId="kpi-sop-percent"
            label="SOP Completion"
            value={checklists?.isEmpty ? '—' : `${checklists?.completionPercent ?? 0}%`}
            sub={checklists?.isEmpty ? 'No checklist items' : `${checklists?.completed ?? 0}/${checklists?.total ?? 0} verified`}
            icon={<CheckSquare size={16} />}
            accent="bg-emerald-500"
            progress={checklists?.completionPercent ?? 0}
          />
          <KpiCard
            testId="kpi-in-progress"
            label="In Progress"
            value={String((tasks?.byStatus?.in_progress ?? 0) + (tasks?.byStatus?.in_review ?? 0))}
            sub="Active task columns"
            icon={<RefreshCw size={16} />}
            accent="bg-orange-500"
          />
        </div>
      </div>
    );
  }
);

function KpiCard({
  testId,
  label,
  value,
  sub,
  icon,
  accent,
  progress,
}: {
  testId: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  progress?: number;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-white p-4 rounded-2xl border border-gray-100 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-7 h-7 rounded-lg ${accent} text-white flex items-center justify-center opacity-90`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
      <p className="text-[11px] font-medium text-gray-500 mt-1">{sub}</p>
      {progress !== undefined && progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
          <div className={`h-full ${accent}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

export default OperationsKpiBar;
