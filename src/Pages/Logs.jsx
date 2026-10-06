import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import { ErrorBox, Icon, Skeleton } from '../Components/UI';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

export default function Logs() {
  const { data, error, reload } = useAsync(api.activity, []);
  const [q, setQ] = useState('');

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-72" />;

  const term = q.trim().toLowerCase();
  const rows = (Array.isArray(data) ? data : []).filter(
    (a) => !term || `${a.actor || ''} ${a.action || ''} ${a.target || ''}`.toLowerCase().includes(term)
  );

  return (
    <div className="space-y-4">
      <div className="relative sm:max-w-sm">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Search by admin, action or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activity log" />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th className="th">When</th>
                <th className="th">Admin</th>
                <th className="th">What changed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="td whitespace-nowrap text-slate-500">{fmt(a.at)}</td>
                  <td className="td font-medium text-slate-900">{a.actor}</td>
                  <td className="td">{a.action} <span className="font-medium text-slate-900">{a.target}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">No log entries match “{q}”.</p>}
      </div>
    </div>
  );
}