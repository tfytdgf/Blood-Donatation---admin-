import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAsync, useUnsavedWarning } from '../hooks';
import { ErrorBox, Field, Skeleton, Switch } from '../Components/UI';

export default function Settings() {
  const { data, error, reload } = useAsync(() => api.getDoc('settings'), []);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-72 max-w-xl" />;
  return <SettingsForm initial={data} />;
}

function SettingsForm({ initial }) {
  const { can } = useAuth();
  const canEdit = can('settings.edit');
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm({ ...form, [key]: value });
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useUnsavedWarning(dirty);

  async function save(e) {
    e.preventDefault();
    const next = { ...form, lowStockPercent: Number(form.lowStockPercent), donationGapDays: Number(form.donationGapDays) };
    if (!(next.lowStockPercent >= 5 && next.lowStockPercent <= 80)) return toast.error('Low-stock level must be between 5% and 80%');
    if (!(next.donationGapDays >= 30 && next.donationGapDays <= 365)) return toast.error('Donation gap must be between 30 and 365 days');
    setSaving(true);
    try {
      const result = await api.saveDoc('settings', next);
      setSaved(result);
      setForm(result);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message || 'Couldn’t save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-5">
      {!canEdit && <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">Only a super admin can change these settings.</p>}
      <fieldset disabled={!canEdit} className="space-y-5">
        <Field label="Organisation name">
          <input className="input" value={form.orgName} onChange={(e) => set('orgName')(e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Low-stock level (% of capacity)">
            <input type="number" min="5" max="80" className="input" value={form.lowStockPercent} onChange={(e) => set('lowStockPercent')(e.target.value)} />
          </Field>
          <Field label="Days between donations">
            <input type="number" min="30" max="365" className="input" value={form.donationGapDays} onChange={(e) => set('donationGapDays')(e.target.value)} />
          </Field>
        </div>
        <p className="-mt-3 text-sm text-slate-500">
          Donors can’t be assigned to a request until this many days have passed since their last donation. Check your local blood-bank guidelines.
        </p>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
          <Switch label="Verify new donors before they’re listed" hint="New sign-ups stay in Pending verification until an admin approves them." checked={form.requireVerification} onChange={set('requireVerification')} />
          <Switch label="Email me about critical requests" hint="Sent to your profile email as soon as a critical request is raised." checked={form.emailAlerts} onChange={set('emailAlerts')} />
        </div>
      </fieldset>
      {canEdit && <button className="btn btn-primary" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save settings'}</button>}
    </form>
  );
}
