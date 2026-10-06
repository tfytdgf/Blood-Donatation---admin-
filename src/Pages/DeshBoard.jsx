import { api } from '../api';
import { useAsync, useLiveReload } from '../hooks';
import { BloodGroup, ErrorBox, Skeleton, StockBar, isLow, timeAgo } from '../Components/UI';

export default function Dashboard() {
  const { data, error, reload } = useAsync(
    () => Promise.all([api.stats(), api.emergencies(), api.inventory(), api.activity(), api.getDoc('settings')]),
    []
  );
  useLiveReload(reload);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <DashboardSkeleton />;

  const [stats, emergencies, inventory, activity, settings] = data;
  const critical = emergencies.filter((e) => e.critical && e.status !== 'resolved');
  const tiles = [
    { label: 'Total donors', value: stats.totalDonors, href: '#/donors' },
    { label: 'Available donors', value: stats.available, href: '#/donors' },
    { label: 'Pending verification', value: stats.pending, href: '#/donors' },
    { label: 'Active emergencies', value: stats.activeEmergencies, href: '#/emergencies', alert: stats.activeEmergencies > 0 },
  ];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-4">
        {tiles.map((t) => (
          <a key={t.label} href={t.href} className="bg-white px-5 py-4 hover:bg-slate-50">
            <dt className="text-sm text-slate-500">{t.label}</dt>
            <dd className={`mt-1 text-3xl font-semibold tabular-nums ${t.alert ? 'text-red-600' : 'text-slate-900'}`}>{t.value}</dd>
          </a>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-red-200 bg-red-50">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-semibold text-red-800">
                <span aria-hidden="true">🚨 </span>Critical requests{critical.length > 0 && ` (${critical.length})`}
              </h2>
              <a href="#/emergencies" className="text-sm font-medium text-red-700 hover:underline">Manage</a>
            </div>
            {critical.length === 0 ? (
              <p className="border-t border-red-100 px-5 py-6 text-sm text-red-700">No critical requests right now.</p>
            ) : (
              <ul className="divide-y divide-red-100 border-t border-red-200">
                {critical.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <BloodGroup group={r.group} solid />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {r.patient} needs {r.units} {r.units === 1 ? 'unit' : 'units'}
                      </p>
                      <p className="truncate text-sm text-slate-600">{r.hospital}, {r.location}</p>
                    </div>
                    <span className="shrink-0 text-xs text-red-700">{timeAgo(r.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-semibold text-slate-900">Recent activity</h2>
              <a href="#/logs" className="text-sm font-medium text-red-700 hover:underline">View log</a>
            </div>
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                  <p>
                    <span className="font-medium text-slate-900">{a.actor}</span> {a.action} <span className="font-medium text-slate-900">{a.target}</span>
                  </p>
                  <span className="shrink-0 text-xs text-slate-500">{timeAgo(a.at)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="h-fit rounded-lg border border-slate-200">
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="font-semibold text-slate-900">Blood inventory</h2>
            <a href="#/inventory" className="text-sm font-medium text-red-700 hover:underline">Details</a>
          </div>
          <ul className="space-y-3 border-t border-slate-100 px-5 py-4">
            {inventory.map((item) => {
              const low = isLow(item, settings.lowStockPercent);
              return (
                <li key={item.group} className="flex items-center gap-3">
                  <BloodGroup group={item.group} />
                  <StockBar item={item} low={low} />
                  <span className={`w-16 text-right text-sm tabular-nums ${low ? 'font-medium text-red-600' : 'text-slate-600'}`}>{item.units} units</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}