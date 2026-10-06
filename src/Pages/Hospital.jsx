import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAsync, useConfirmClose, useLiveReload, useUnsavedWarning } from '../hooks';
import { ErrorBox, Field, Icon, Modal, Skeleton } from '../Components/UI';

export default function Hospitals() {
  const { can } = useAuth();
  const { data, error, reload } = useAsync(api.hospitals, []);
  useLiveReload(reload);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | hospital

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-72" />;

  const canManage = can('hospital.manage');
  const term = q.trim().toLowerCase();
  const rows = (Array.isArray(data) ? data : []).filter(
    (h) => !term || (h.name && h.name.toLowerCase().includes(term)) || (h.city && h.city.toLowerCase().includes(term))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-full sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by hospital or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search hospitals" />
        </div>
        {canManage && <button className="btn btn-primary" onClick={() => setEditing('new')}>Add hospital</button>}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <caption className="sr-only">Hospitals</caption>
            <thead>
              <tr>
                <th scope="col" className="th">Hospital</th>
                <th scope="col" className="th">Contact</th>
                <th scope="col" className="th">Active requests</th>
                <th scope="col" className="th text-right">Units received (30 days)</th>
                {canManage && <th scope="col" className="th text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/60">
                  <td className="td">
                    <p className="font-medium text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.city}</p>
                  </td>
                  <td className="td">
                    <p>{h.contact}</p>
                    <p className="text-xs text-slate-500">{h.phone}</p>
                  </td>
                  <td className="td">
                    {h.active > 0 ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">{h.active} active</span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="td text-right tabular-nums">{h.unitsMonth}</td>
                  {canManage && (
                    <td className="td text-right">
                      <button className="btn btn-sm" aria-label={`Edit ${h.name}`} onClick={() => setEditing(h)}>Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">No hospitals match “{q}”.</p>}
      </div>

      {editing && (
        <HospitalModal
          hospital={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function HospitalModal({ hospital, onClose, onSaved }) {
  const start = { name: hospital?.name ?? '', city: hospital?.city ?? '', contact: hospital?.contact ?? '', phone: hospital?.phone ?? '' };
  const [form, setForm] = useState(start);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(start);
  useUnsavedWarning(dirty);
  const close = useConfirmClose(dirty, onClose);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Enter the hospital name';
    if (!form.city.trim()) next.city = 'Enter the city';
    if (!form.contact.trim()) next.contact = 'Enter a contact person';
    if (!/^\+?[0-9 ]{6,15}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      if (hospital) await api.updateHospital(hospital.id, form);
      else await api.createHospital(form);
      toast.success(hospital ? 'Hospital updated' : `${form.name} added`);
      onSaved();
    } catch (err) {
      if (err.status === 409) setErrors({ name: err.message });
      else toast.error(err.message || 'Couldn’t save the hospital');
      setSaving(false);
    }
  }

  return (
    <Modal title={hospital ? 'Edit hospital' : 'Add hospital'} onClose={close}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="Hospital name" error={errors.name}>
          <input className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="City" error={errors.city}>
          <input className="input" value={form.city} onChange={set('city')} />
        </Field>
        <Field label="Contact person" error={errors.contact}>
          <input className="input" value={form.contact} onChange={set('contact')} />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : hospital ? 'Save changes' : 'Add hospital'}</button>
        </div>
      </form>
    </Modal>
  );
}