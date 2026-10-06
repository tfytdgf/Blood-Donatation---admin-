import { useEffect, useState } from 'react';
import { MOCK_MODE, api } from '../api';
import { useAuth } from '../auth';
import { Field, Icon } from '../Components/UI';
import { passwordProblem } from '../passwords';

const SAMPLE = [
  ['Super admin', 'admin@bloodnetwork.org', 'admin123'],
  ['Verifier', 'verifier@bloodnetwork.org', 'verify123'],
  ['Viewer (no two-step)', 'viewer@bloodnetwork.org', 'view123'],
];

// A reset link looks like  https://your-admin/#/reset?token=abc123
const resetToken = () => {
  const [path, query = ''] = window.location.hash.split('?');
  return path === '#/reset' ? new URLSearchParams(query).get('token') || '' : null;
};

export default function Login() {
  const [mode, setMode] = useState(() => (resetToken() === null ? 'signin' : 'reset'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [challenge, setChallenge] = useState('');
  const [notice2, setNotice2] = useState('');

  const showSample = MOCK_MODE && mode !== 'reset';

  // Opening a reset link while this screen is already showing (same tab) switches to the reset form.
  useEffect(() => {
    const onHash = () => resetToken() !== null && setMode('reset');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white">
            <Icon name="drop" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">Blood Network</p>
            <p className="text-sm text-slate-500">Admin console</p>
          </div>
        </div>

        {mode === 'signin' && (
          <SignIn
            form={form}
            setForm={setForm}
            notice2={notice2}
            onForgot={() => { setNotice2(''); setMode('forgot'); }}
            onChallenge={(c) => { setChallenge(c); setMode('code'); }}
          />
        )}
        {mode === 'code' && <Code challenge={challenge} onBack={() => setMode('signin')} />}
        {mode === 'forgot' && <Forgot email={form.email} onBack={() => setMode('signin')} />}
        {mode === 'reset' && (
          <Reset
            token={resetToken() || ''}
            onDone={() => {
              window.location.hash = '#/';
              setNotice2('Your password was changed. Sign in with the new one.');
              setMode('signin');
            }}
          />
        )}

        {showSample && (
          <div className="mt-8 border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700">Sample accounts</p>
            <p className="text-xs text-slate-500">Shown only while the app runs on sample data. The two-step code is 123456.</p>
            <ul className="mt-2 space-y-1">
              {SAMPLE.map(([role, email, password]) => (
                <li key={email} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{role}</span>
                  <button type="button" className="font-medium text-red-700 hover:underline" onClick={() => { setForm({ email, password }); setMode('signin'); }}>Fill in</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

function SignIn({ form, setForm, notice2, onForgot, onChallenge }) {
  const { login, notice } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return setError('Enter your email and password');
    setBusy(true);
    setError('');
    try {
      const next = await login(form.email.trim(), form.password);
      if (next) onChallenge(next.challenge);
    } catch (err) {
      setError(err.message || 'Couldn’t sign in. Try again.');
    }
    setBusy(false);
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
      {(notice || notice2) && <p role="status" className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice || notice2}</p>}
      <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
        <Field label="Email">
          <input type="email" autoComplete="username" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full py-2" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <button type="button" className="mt-3 text-sm font-medium text-red-700 hover:underline" onClick={onForgot}>Forgot your password?</button>
    </>
  );
}

function Code({ challenge, onBack }) {
  const { confirmCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code');
    setBusy(true);
    setError('');
    try {
      await confirmCode(challenge, code);
    } catch (err) {
      setError(err.message || 'That code didn’t work');
      setBusy(false);
      if (/sign in again|expired/i.test(err.message || '')) onBack();
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Two-step sign-in</h1>
      <p className="mt-1 text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
      <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
        <Field label="Code">
          <input
            className="input text-center text-lg tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
          />
        </Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full py-2" disabled={busy}>{busy ? 'Checking…' : 'Verify and sign in'}</button>
      </form>
      <button type="button" className="mt-3 text-sm font-medium text-slate-600 hover:underline" onClick={onBack}>Back to sign in</button>
    </>
  );
}

function Forgot({ email: initial, onBack }) {
  const [email, setEmail] = useState(initial);
  const [sent, setSent] = useState(null); // null | { demoToken? }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    setBusy(true);
    setError('');
    try {
      setSent(await api.forgotPassword(email.trim()));
    } catch (err) {
      setError(err.message || 'Couldn’t send the reset link. Try again.');
    }
    setBusy(false);
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
      {sent ? (
        <div className="mt-3 space-y-3 text-sm text-slate-600" role="status">
          <p>If that email belongs to an account, we’ve sent a link to reset the password. It works for 30 minutes.</p>
          {sent.demoToken && (
            <p className="rounded-md bg-slate-50 px-3 py-2">
              Sample mode has no email, so here is the link:{' '}
              <a className="font-medium text-red-700 underline" href={`#/reset?token=${sent.demoToken}`}>Open reset link</a>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <Field label="Email">
            <input type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button className="btn btn-primary w-full py-2" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <button type="button" className="mt-3 text-sm font-medium text-slate-600 hover:underline" onClick={onBack}>Back to sign in</button>
    </>
  );
}

function Reset({ token, onDone }) {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const problem = passwordProblem(form.password);
    if (problem) return setError(problem);
    if (form.password !== form.confirm) return setError('The two passwords don’t match');
    setBusy(true);
    setError('');
    try {
      await api.resetPassword(token, form.password);
      onDone();
    } catch (err) {
      setError(err.message || 'Couldn’t reset the password');
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
      <p className="mt-1 text-sm text-slate-600">At least 10 characters, with a letter and a number.</p>
      <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
        <Field label="New password">
          <input type="password" autoComplete="new-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Confirm new password">
          <input type="password" autoComplete="new-password" className="input" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full py-2" disabled={busy || !token}>{busy ? 'Saving…' : 'Save new password'}</button>
        {!token && <p className="text-sm text-red-600">This link is missing its token. Ask for a new reset link.</p>}
      </form>
    </>
  );
}