import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAsync, useUnsavedWarning } from '../hooks';
import { ROLE_LABELS } from '../permissions';
import { ErrorBox, Field, Skeleton, initials } from '../Components/UI';
import { passwordProblem } from '../passwords';

export default function Profile() {
  const { data, error, reload } = useAsync(() => api.getDoc('profile'), []);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-72 max-w-xl" />;
  return <ProfileForm initial={data} />;
}

function ProfileForm({ initial }) {
  const { updateUser } = useAuth();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useUnsavedWarning(dirty);

  async function save(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Enter your name';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const result = await api.saveDoc('profile', { name: form.name, phone: form.phone });
      setSaved(result);
      setForm(result);
      updateUser({ name: result.name });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Couldn’t update your profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-10">
    <form onSubmit={save} className="space-y-4" noValidate>
      <div className="flex items-center gap-4 pb-2">
        <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700">{initials(saved.name)}</span>
        <div>
          <p className="font-medium text-slate-900">{saved.name}</p>
          <p className="text-sm text-slate-500">{ROLE_LABELS[saved.role] || saved.role}</p>
        </div>
      </div>
      <Field label="Full name" error={errors.name}>
        <input className="input" value={form.name} onChange={set('name')} />
      </Field>
      <Field label="Email">
        <input type="email" className="input" value={form.email} readOnly />
      </Field>
      <Field label="Phone">
        <input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" />
      </Field>
      <button className="btn btn-primary" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save profile'}</button>
    </form>
    <Security profile={saved} />
    </div>
  );
}

function Security({ profile }) {
  return (
    <section aria-labelledby="security-h" className="space-y-6 border-t border-slate-200 pt-8">
      <h2 id="security-h" className="font-semibold text-slate-900">Sign-in security</h2>
      <ChangePassword />
      <TwoStep profile={profile} />
    </section>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = Boolean(form.current || form.next || form.confirm);
  useUnsavedWarning(dirty);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const problem = passwordProblem(form.next);
    if (!form.current) return setError('Enter your current password');
    if (problem) return setError(problem);
    if (form.next !== form.confirm) return setError('The two new passwords don’t match');
    setBusy(true);
    setError('');
    try {
      await api.changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      setError(err.message || 'Couldn’t change the password');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <h3 className="text-sm font-medium text-slate-800">Change password</h3>
      <Field label="Current password">
        <input type="password" autoComplete="current-password" className="input" value={form.current} onChange={set('current')} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="New password">
          <input type="password" autoComplete="new-password" className="input" value={form.next} onChange={set('next')} />
        </Field>
        <Field label="Confirm new password">
          <input type="password" autoComplete="new-password" className="input" value={form.confirm} onChange={set('confirm')} />
        </Field>
      </div>
      <p className="text-sm text-slate-500">At least 10 characters, with a letter and a number.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button>
    </form>
  );
}

function TwoStep({ profile }) {
  const [on, setOn] = useState(profile.twoFactor);
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.setTwoFactor(!on, password);
      setOn(res.twoFactor);
      setAsking(false);
      setPassword('');
      toast.success(res.twoFactor ? 'Two-step sign-in is on' : 'Two-step sign-in is off');
    } catch (err) {
      setError(err.message || 'Couldn’t change this setting');
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-800">Two-step sign-in</h3>
      <p className="text-sm text-slate-600">
        {on ? 'On. After your password, you enter a 6-digit code from your authenticator app.' : 'Off. Turn it on to protect your account if your password leaks.'}
      </p>
      {!asking ? (
        <button className="btn" onClick={() => setAsking(true)}>{on ? 'Turn off' : 'Turn on'}</button>
      ) : (
        <form onSubmit={confirm} className="flex flex-col gap-2 sm:flex-row sm:items-start" noValidate>
          <div className="sm:w-64">
            <input type="password" aria-label="Your password" placeholder="Enter your password to confirm" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <button className="btn btn-primary" disabled={busy || !password}>{busy ? 'Saving…' : 'Confirm'}</button>
          <button type="button" className="btn" onClick={() => { setAsking(false); setPassword(''); setError(''); }}>Cancel</button>
        </form>
      )}
    </div>
  );
}