import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api';
import { useAuth } from '../auth';
import { DEFAULT_GAP_DAYS, donorStatus, eligibility } from '../donorRules';
import { downloadCsv, toCsv } from '../csv';
import { useAsync, useDebounce } from '../hooks';
import AddDonorModal from '../Components/AddDonorModal';
import DonorDrawer from '../Components/Donordrawer';
import { BLOOD_GROUPS, BloodGroup, DONOR_STATUS_OPTIONS, DonorStatus, ErrorBox, Icon, Pagination, formatDate, initials } from '../Components/UI';

const LIMIT = 10;

const CSV_COLUMNS = [
  { header: 'Name', get: (d) => d.name, guard: true },
  { header: 'Phone', get: (d) => d.phone },
  { header: 'Blood group', get: (d) => d.group },
  { header: 'Status', get: (d) => donorStatus(d) },
  { header: 'Verification', get: (d) => d.verification },
  { header: 'Availability', get: (d) => d.availability },
  { header: 'Account', get: (d) => d.account },
  { header: 'Location', get: (d) => d.location, guard: true },
  { header: 'Last donation', get: (d) => d.lastDonation || '' },
];

export default function Donors() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null); // { donor, edit }
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const term = useDebounce(search);

  const { data, loading, error, reload } = useAsync(() => {
    const params = { page, limit: LIMIT };
    if (term) params.search = term;
    if (group) params.group = group;
    if (status) params.status = status;
    return api.donors(params);
  }, [term, group, status, page]);
  const { data: settings } = useAsync(() => api.getDoc('settings'), []);

  const gapDays = settings?.donationGapDays ?? DEFAULT_GAP_DAYS;
  const rows = data?.items ?? [];
  const filtered = Boolean(search || group || status);
  const canVerify = can('donor.verify');
  const verifiable = rows.filter((d) => d.verification === 'pending' && d.account === 'active');
  const allPicked = verifiable.length > 0 && verifiable.every((d) => selected.has(d.id));

  // A selection only makes sense for the rows currently on screen.
  useEffect(() => setSelected(new Set()), [term, group, status, page]);

  function toggleOne(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function verifySelected() {
    try {
      const { verified, skipped } = await api.bulkVerify([...selected]);
      toast.success(`${verified} ${verified === 1 ? 'donor' : 'donors'} verified${skipped ? `, ${skipped} skipped` : ''}`);
      setSelected(new Set());
      reload();
    } catch (err) {
      toast.error(err.message || 'Couldn’t verify the selected donors');
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const params = {};
      if (term) params.search = term;
      if (group) params.group = group;
      if (status) params.status = status;
      const { items } = await api.exportDonors(params);
      downloadCsv(`donors-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(items, CSV_COLUMNS));
      toast.success(`Exported ${items.length} ${items.length === 1 ? 'donor' : 'donors'}`);
    } catch (err) {
      toast.error(err.message || 'Couldn’t export the donor list');
    } finally {
      setExporting(false);
    }
  }

  async function save(donor, patch, message) {
    try {
      const updated = await api.updateDonor(donor.id, patch);
      toast.success(message);
      setOpen((cur) => (cur && cur.donor.id === donor.id ? { ...cur, donor: updated } : cur));
      reload();
      return true;
    } catch (err) {
      toast.error(err.message || 'Couldn’t save changes');
      return false;
    }
  }

  function toggleBlock(d) {
    const blocking = d.account !== 'blocked';
    if (blocking && !window.confirm(`Block ${d.name}? They won’t be matched to emergency requests.`)) return Promise.resolve(false);
    return save(
      d,
      blocking ? { account: 'blocked' } : { account: 'active', verification: 'pending' },
      blocking ? `${d.name} blocked` : `${d.name} unblocked and sent for re-verification`
    );
  }

  function clearFilters() {
    setSearch('');
    setGroup('');
    setStatus('');
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search donors by name or phone" />
        </div>
        <select className="input sm:w-40" value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); }} aria-label="Filter by blood group">
          <option value="">All blood groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select className="input sm:w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {DONOR_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(can('donor.export') || can('donor.create')) && (
          <div className="flex gap-2">
            {can('donor.export') && (
              <button className="btn flex-1 sm:flex-none" onClick={exportCsv} disabled={exporting}>{exporting ? 'Exporting…' : 'Export CSV'}</button>
            )}
            {can('donor.create') && <button className="btn btn-primary flex-1 sm:flex-none" onClick={() => setAdding(true)}>Add donor</button>}
          </div>
        )}
      </div>

      {canVerify && selected.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm">
          <p className="font-medium text-red-800">{selected.size} selected</p>
          <button className="btn btn-sm btn-primary" onClick={verifySelected}>Verify selected</button>
          <button className="btn btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">{data ? `${data.total} donors found` : ''}</p>

      {error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            <table className="w-full min-w-[600px]">
              <caption className="sr-only">Donors</caption>
              <thead>
                <tr>
                  {canVerify && (
                    <th scope="col" className="th w-10">
                      <input
                        type="checkbox"
                        className="accent-red-600"
                        aria-label="Select all donors on this page who are waiting for verification"
                        disabled={verifiable.length === 0}
                        checked={allPicked}
                        onChange={() => setSelected(allPicked ? new Set() : new Set(verifiable.map((d) => d.id)))}
                      />
                    </th>
                  )}
                  <th scope="col" className="th">Donor</th>
                  <th scope="col" className="th hidden sm:table-cell">Phone</th>
                  <th scope="col" className="th">Blood group</th>
                  <th scope="col" className="th">Status</th>
                  <th scope="col" className="th hidden lg:table-cell">Location</th>
                  <th scope="col" className="th hidden md:table-cell">Last donation</th>
                  <th scope="col" className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((d) => {
                  const el = eligibility(d.lastDonation, gapDays);
                  return (
                    <tr key={d.id} className={selected.has(d.id) ? 'bg-red-50/60' : 'hover:bg-slate-50/60'}>
                      {canVerify && (
                        <td className="td w-10">
                          {d.verification === 'pending' && d.account === 'active' && (
                            <input type="checkbox" className="accent-red-600" aria-label={`Select ${d.name}`} checked={selected.has(d.id)} onChange={() => toggleOne(d.id)} />
                          )}
                        </td>
                      )}
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">{initials(d.name)}</span>
                          <div>
                            <button className="text-left font-medium text-slate-900 hover:underline" onClick={() => setOpen({ donor: d, edit: false })}>{d.name}</button>
                            <p className="text-xs text-slate-500 sm:hidden">{d.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td hidden whitespace-nowrap sm:table-cell"><a className="hover:underline" href={`tel:${d.phone.replace(/[^\d+]/g, '')}`}>{d.phone}</a></td>
                      <td className="td"><BloodGroup group={d.group} /></td>
                      <td className="td"><DonorStatus status={donorStatus(d)} /></td>
                      <td className="td hidden lg:table-cell">{d.location}</td>
                      <td className="td hidden whitespace-nowrap md:table-cell">
                        {formatDate(d.lastDonation)}
                        {!el.eligible && <p className="text-xs text-amber-700">Eligible {formatDate(el.on)}</p>}
                      </td>
                      <td className="td">
                        <div className="flex justify-end gap-1.5">
                          <button className="btn btn-sm" aria-label={`View ${d.name}`} onClick={() => setOpen({ donor: d, edit: false })}>View</button>
                          {can('donor.edit') && <button className="btn btn-sm" aria-label={`Edit ${d.name}`} onClick={() => setOpen({ donor: d, edit: true })}>Edit</button>}
                          {can('donor.block') && (
                            <button className="btn btn-sm btn-danger" aria-label={`${d.account === 'blocked' ? 'Unblock' : 'Block'} ${d.name}`} onClick={() => toggleBlock(d)}>
                              {d.account === 'blocked' ? 'Unblock' : 'Block'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && rows.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="font-medium text-slate-800">No donors match these filters</p>
              <p className="mt-1 text-sm text-slate-500">Try a different name, phone number or blood group.</p>
              {filtered && <button className="btn mt-4" onClick={clearFilters}>Clear filters</button>}
            </div>
          )}
          <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onChange={setPage} />
        </div>
      )}

      {adding && (
        <AddDonorModal
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            clearFilters();
            reload();
          }}
        />
      )}

      {open && (
        <DonorDrawer
          key={open.donor.id}
          donor={open.donor}
          startEditing={open.edit}
          gapDays={gapDays}
          onClose={() => setOpen(null)}
          onSave={save}
          onBlock={toggleBlock}
        />
      )}
    </div>
  );
}