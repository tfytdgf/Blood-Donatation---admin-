import { useEffect, useId, useRef } from 'react';
import { useFocusTrap } from '../hooks';

const ICONS = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  users: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6',
  alert: 'M12 3l9.5 17h-19L12 3zM12 10v4M12 17.5v.01',
  building: 'M4 21V5l8-2 8 2v16M9 21v-5h6v5M9 8h.01M15 8h.01M9 12h.01M15 12h.01',
  drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  list: 'M4 6h16M4 12h16M4 18h10',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
  bell: 'M6 17v-6a6 6 0 0112 0v6l1.5 2h-15L6 17zM10 21h4',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 6h16M4 12h16M4 18h16',
  volume: 'M4 9v6h4l5 4V5L8 9H4zM16.5 9a4 4 0 010 6M19 6.5a8 8 0 010 11',
  mute: 'M4 9v6h4l5 4V5L8 9H4zM17 9l4 6M21 9l-4 6',
};

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  dark: 'bg-slate-800 text-white ring-slate-800',
  red: 'bg-red-50 text-red-700 ring-red-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export const Tag = ({ tone = 'slate', children }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>{children}</span>
);

const DONOR_STATUS = {
  available: ['Available', 'green'],
  pending: ['Pending verification', 'amber'],
  unavailable: ['Not available', 'slate'],
  blocked: ['Blocked', 'dark'],
};
const REQUEST_STATUS = {
  open: ['Open', 'red'],
  verified: ['Verified', 'amber'],
  assigned: ['Assigned', 'sky'],
  resolved: ['Resolved', 'green'],
};

export const DONOR_STATUS_OPTIONS = Object.entries(DONOR_STATUS).map(([value, [label]]) => ({ value, label }));
export const DonorStatus = ({ status }) => <Tag tone={DONOR_STATUS[status][1]}>{DONOR_STATUS[status][0]}</Tag>;
export const RequestStatus = ({ status }) => <Tag tone={REQUEST_STATUS[status][1]}>{REQUEST_STATUS[status][0]}</Tag>;

export function BloodGroup({ group, solid }) {
  return (
    <span
      className={`inline-flex w-11 shrink-0 justify-center rounded-md py-0.5 text-xs font-semibold ${solid ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-100'}`}
      aria-label={`Blood group ${group}`}
    >
      {group}
    </span>
  );
}

export const isLow = (item, pct = 25) => (item.units / item.capacity) * 100 < pct;

export function StockBar({ item, low }) {
  const pct = Math.min(100, Math.round((item.units / item.capacity) * 100));
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${pct}% of capacity`}>
      <div className={`h-full rounded-full ${low ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

export const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('');

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none ${className}`} />
);

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
      <p className="font-medium">Couldn’t load this page</p>
      <p className="mt-1 text-red-700">{error.message}. Check your connection and try again.</p>
      <button className="btn mt-3" onClick={onRetry}>Try again</button>
    </div>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-sm text-slate-500">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-red-600 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-red-500 peer-focus-visible:ring-offset-2" />
    </label>
  );
}

export function Modal({ title, onClose, children, footer, size }) {
  const box = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useFocusTrap(box);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-full w-full ${size === 'lg' ? 'max-w-lg' : 'max-w-md'} overflow-y-auto rounded-t-xl bg-white shadow-xl outline-none sm:rounded-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id={titleId} className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
      <p>Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
        <span className="hidden sm:inline">Page {page} of {pages}</span>
        <button className="btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </nav>
  );
}