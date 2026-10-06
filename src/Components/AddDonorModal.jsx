import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api';
import { useAuth } from '../auth';
import { useConfirmClose, useUnsavedWarning } from '../hooks';
import { BLOOD_GROUPS, Field, Modal } from './UI';

const PHONE_RE = /^\+?[0-9 ]{10,15}$/;
const EMPTY = { name: '', phone: '', group: 'O+', location: '', lastDonation: '', markVerified: false };

export default function AddDonorModal({ onClose, onCreated }) {
  const { can } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY);
  useUnsavedWarning(dirty);
  const close = useConfirmClose(dirty, onClose);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Enter the donor’s name';
    if (!PHONE_RE.test(form.phone.trim())) next.phone = 'Enter a valid phone number, like +91 98765 43210';
    if (!form.location.trim()) next.location = 'Enter a city or area';
    if (form.lastDonation && form.lastDonation > today) next.lastDonation = 'Last donation can’t be in the future';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const donor = await api.createDonor({ ...form, lastDonation: form.lastDonation || undefined });
      toast.success(`${donor.name} added`);
      onCreated(donor);
    } catch (err) {
      if (err.status === 409) setErrors({ phone: err.message });
      else toast.error(err.message || 'Couldn’t add the donor');
      setSaving(false);
    }
  }

  return (
    <Modal title="Add donor" onClose={close}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="Full name" error={errors.name}>
          <input className="input" value={form.name} onChange={set('name')} autoComplete="off" />
        </Field>
        <Field label="Phone (with country code)" error={errors.phone}>
          <input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="+91 98765 43210" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Blood group">
            <select className="input" value={form.group} onChange={set('group')}>
              {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Last donation (optional)" error={errors.lastDonation}>
            <input type="date" className="input" max={today} value={form.lastDonation} onChange={set('lastDonation')} />
          </Field>
        </div>
        <Field label="Location" error={errors.location}>
          <input className="input" value={form.location} onChange={set('location')} placeholder="City or area" />
        </Field>
        {can('donor.verify') ? (
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 accent-red-600" checked={form.markVerified} onChange={(e) => setForm({ ...form, markVerified: e.target.checked })} />
            <span>I have checked this donor’s identity, so mark them as verified</span>
          </label>
        ) : (
          <p className="text-sm text-slate-500">New donors start as pending verification.</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add donor'}</button>
        </div>
      </form>
    </Modal>
  );
}