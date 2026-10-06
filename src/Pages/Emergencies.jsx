import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api';
import { useAuth } from '../auth';
import { COMPATIBLE_DONORS, DEFAULT_GAP_DAYS, emergencyMessage, rankDonors } from '../donorRules';
import { useAsync, useLiveReload } from '../hooks';
import ContactButtons from '../Components/Contactbuttons';
import { BloodGroup, ErrorBox, Modal, RequestStatus, Skeleton, formatDate, timeAgo } from '../Components/UI';

const TABS = [
  ['all', 'All'],
  ['open', 'Open'],
  ['verified', 'Verified'],
  ['assigned', 'Assigned'],
  ['resolved', 'Resolved'],
];

export default function Emergencies() {
  const { data, error, reload } = useAsync(() => Promise.all([api.emergencies(), api.getDoc('settings')]), []);
  useLiveReload(reload);
  const [tab, setTab] = useState('all');
  const [assigning, setAssigning] = useState(null);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-72" />;

  const [requests, settings] = data;
  const critical = requests.filter((r) => r.critical && r.status !== 'resolved');
  const visible = tab === 'all' ? requests : requests.filter((r) => r.status === tab);

  async function update(req, patch, message) {
    try {
      await api.updateEmergency(req.id, patch);
      toast.success(message);
      setAssigning(null);
    } catch (err) {
      toast.error(err.message || 'Couldn’t update the request');
    }
    reload();
  }

  const handlers = {
    verify: (r) => update(r, { status: 'verified' }, `Request for ${r.patient} verified`),
    assign: (r) => setAssigning(r),
    resolve: (r) => update(r, { status: 'resolved' }, `Request for ${r.patient} resolved`),
  };

  return (
    <div className="space-y-6">
      {critical.length > 0 && (
        <section aria-labelledby="critical-h" className="rounded-lg border border-red-300 bg-red-50">
          <h2 id="critical-h" className="px-5 py-3 font-semibold text-red-800">
            <span aria-hidden="true">🚨 </span>Critical requests ({critical.length})
          </h2>
          <ul className="divide-y divide-red-100 border-t border-red-200">
            {critical.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <BloodGroup group={r.group} solid />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{r.patient} needs {r.units} {r.units === 1 ? 'unit' : 'units'}</p>
                  <p className="text-sm text-slate-600">{r.hospital}, {r.location}. Raised {timeAgo(r.createdAt)}.</p>
                </div>
                <RequestStatus status={r.status} />
                <Actions req={r} {...handlers} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="All requests" className="overflow-hidden rounded-lg border border-slate-200">
        <div role="tablist" aria-label="Filter requests" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2">
          {TABS.map(([id, label]) => {
            const count = id === 'all' ? requests.length : requests.filter((r) => r.status === id).length;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${tab === id ? 'bg-slate-900 font-medium text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {label} <span className={tab === id ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <caption className="sr-only">Emergency requests</caption>
            <thead>
              <tr>
                <th scope="col" className="th">Patient</th>
                <th scope="col" className="th">Hospital</th>
                <th scope="col" className="th">Blood group</th>
                <th scope="col" className="th">Units</th>
                <th scope="col" className="th">Location</th>
                <th scope="col" className="th">Request status</th>
                <th scope="col" className="th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => {
                const hot = r.critical && r.status !== 'resolved';
                return (
                  <tr key={r.id} className={hot ? 'bg-red-50' : ''}>
                    <td className={`td border-l-4 ${hot ? 'border-l-red-600' : 'border-l-transparent'}`}>
                      <p className="font-medium text-slate-900">{r.patient}</p>
                      <p className="text-xs text-slate-500">{r.assignedTo ? `Donor: ${r.assignedTo}` : `Raised ${timeAgo(r.createdAt)}`}</p>
                    </td>
                    <td className="td">{r.hospital}</td>
                    <td className="td"><BloodGroup group={r.group} solid={hot} /></td>
                    <td className="td tabular-nums">{r.units}</td>
                    <td className="td">{r.location}</td>
                    <td className="td"><RequestStatus status={r.status} /></td>
                    <td className="td"><div className="flex justify-end"><Actions req={r} {...handlers} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">No requests in this view.</p>}
      </section>

      {assigning && (
        <AssignModal
          req={assigning}
          gapDays={settings.donationGapDays ?? DEFAULT_GAP_DAYS}
          onClose={() => setAssigning(null)}
          onDone={(donor) => update(assigning, { status: 'assigned', assignedDonorId: donor.id }, `${donor.name} assigned to ${assigning.patient}`)}
        />
      )}
    </div>
  );
}

function Actions({ req, verify, assign, resolve }) {
  const { can } = useAuth();
  if (req.status === 'resolved') return <span className="text-sm text-slate-400">Closed</span>;
  if (!can('emergency.manage')) return <span className="text-sm text-slate-400">View only</span>;
  const label = (verb) => `${verb} request for ${req.patient}`;
  if (req.status === 'open') return <button className="btn btn-primary" aria-label={label('Verify')} onClick={() => verify(req)}>Verify</button>;
  if (req.status === 'verified') return <button className="btn btn-primary" aria-label={label('Assign donor to')} onClick={() => assign(req)}>Assign donor</button>;
  return <button className="btn" aria-label={label('Resolve')} onClick={() => resolve(req)}>Resolve</button>;
}

function AssignModal({ req, gapDays, onClose, onDone }) {
  const groups = COMPATIBLE_DONORS[req.group] || [req.group];
  const { data, loading, error } = useAsync(
    () => api.donors({ groups: groups.join(','), status: 'available', limit: 100 }),
    [req.id]
  );
  const [donorId, setDonorId] = useState('');
  const ranked = rankDonors(req, data?.items ?? [], gapDays);
  const chosen = ranked.find((d) => String(d.id) === donorId);
  const eligibleCount = ranked.filter((d) => d.eligible).length;

  return (
    <Modal
      size="lg"
      title={`Assign a donor for ${req.patient}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!chosen} onClick={() => onDone(chosen)}>Assign donor</button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        {req.units} {req.units === 1 ? 'unit' : 'units'} of {req.group} needed at {req.hospital}. Showing {groups.join(', ')} donors: same group first, then nearest to the hospital.
      </p>

      {error ? (
        <p role="alert" className="text-sm text-red-600">Couldn’t load donors. {error.message}</p>
      ) : loading ? (
        <Skeleton className="h-24" />
      ) : ranked.length === 0 || eligibleCount === 0 ? (
        <p className="text-sm text-red-600">
          No eligible {req.group} donors right now. Ask a nearby hospital’s blood bank for stock.
        </p>
      ) : null}

      {ranked.length > 0 && (
        <fieldset>
          <legend className="sr-only">Choose a donor</legend>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
            {ranked.map((d) => (
              <li key={d.id} className={`flex items-start gap-3 px-3 py-3 ${d.eligible ? '' : 'bg-slate-50 text-slate-500'}`}>
                <input
                  type="radio"
                  name="donor"
                  className="mt-1 accent-red-600"
                  disabled={!d.eligible}
                  checked={donorId === String(d.id)}
                  onChange={() => setDonorId(String(d.id))}
                  aria-label={`Select ${d.name}`}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                    {d.name} <BloodGroup group={d.group} />
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.location}{d.km != null ? `, ${d.km} km from hospital` : ''}. {d.exact ? 'Same group' : `Compatible (${d.group} donor)`}.
                  </p>
                  {d.eligible ? (
                    <ContactButtons compact label={d.name} phone={d.phone} message={emergencyMessage(req)} />
                  ) : (
                    <p className="text-xs text-amber-700">Donated recently. Eligible again on {formatDate(d.on)}.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </Modal>
  );
}