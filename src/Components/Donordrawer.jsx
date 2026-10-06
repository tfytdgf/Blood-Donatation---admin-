import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { eligibility } from '../donorRules';
import { useAsync, useFocusTrap, useUnsavedWarning } from '../hooks';
import ContactButtons from './Contactbuttons';
import { BLOOD_GROUPS, BloodGroup, DonorStatus, Field, Icon, RequestStatus, Skeleton, Tag, formatDate, initials } from './UI';
import { donorStatus } from '../donorRules';

const PHONE_RE = /^\+?[0-9 ]{10,15}$/;
const formOf = (d) => ({ name: d.name, phone: d.phone, group: d.group, location: d.location, availability: d.availability });

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-900">{children}</dd>
    </div>
  );
}

export default function DonorDrawer({ donor, startEditing, gapDays, onClose, onSave, onBlock }) {
  const { can } = useAuth();
  const panel = useRef(null);
  const closeRef = useRef();
  const [editing, setEditing] = useState(Boolean(startEditing) && can('donor.edit'));
  const [form, setForm] = useState(() => formOf(donor));
  const [errors, setErrors] = useState({});
  const [shown, setShown] = useState(false);
  const { data: detail, loading } = useAsync(() => api.donor(donor.id), [donor.id]);

  useFocusTrap(panel);
  const dirty = editing && JSON.stringify(form) !== JSON.stringify(formOf(donor));
  useUnsavedWarning(dirty);

  function requestClose() {
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  }
  closeRef.current = requestClose;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const blocked = donor.account === 'blocked';
  const pending = donor.verification === 'pending';
  const el = eligibility(donor.lastDonation, gapDays);
  const canEdit = can('donor.edit');
  const firstName = donor.name.split(' ')[0];

  function cancelEdit() {
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setForm(formOf(donor));
    setErrors({});
    setEditing(false);
  }

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Enter the donor’s name';
    if (!PHONE_RE.test(form.phone.trim())) next.phone = 'Enter a valid phone number, like +91 98765 43210';
    if (!form.location.trim()) next.location = 'Enter a city or area';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (await onSave(donor, form, 'Donor details updated')) setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/30" onClick={requestClose} />
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Donor details for ${donor.name}`}
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl outline-none transition-transform duration-200 motion-reduce:transition-none ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{initials(donor.name)}</span>
            <div>
              <h2 className="font-semibold text-slate-900">{donor.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <BloodGroup group={donor.group} solid />
                <DonorStatus status={donorStatus(donor)} />
              </div>
            </div>
          </div>
          <button onClick={requestClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close donor details">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {editing ? (
            <form id="donor-edit-form" onSubmit={submit} className="space-y-3" noValidate>
              <Field label="Full name" error={errors.name}>
                <input className="input" value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Blood group">
                  <select className="input" value={form.group} onChange={set('group')}>
                    {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Availability">
                  <select className="input" value={form.availability} onChange={set('availability')}>
                    <option value="available">Available</option>
                    <option value="unavailable">Not available</option>
                  </select>
                </Field>
              </div>
              <Field label="Location" error={errors.location}>
                <input className="input" value={form.location} onChange={set('location')} />
              </Field>
              <p className="text-sm text-slate-500">Verification and account status are changed with the Verify and Block buttons.</p>
            </form>
          ) : (
            <>
              <ContactButtons
                phone={donor.phone}
                label={donor.name}
                message={`Hello ${firstName}, this is Blood Network. Are you available to donate blood soon? Please reply when you can.`}
              />

              <dl className="divide-y divide-slate-100 text-sm">
                <Row label="Full name">{donor.name}</Row>
                <Row label="Phone">{donor.phone}</Row>
                <Row label="Blood group"><BloodGroup group={donor.group} /></Row>
                <Row label="Verification">{pending ? <Tag tone="amber">Pending verification</Tag> : <Tag tone="green">Verified</Tag>}</Row>
                <Row label="Account">{blocked ? <Tag tone="dark">Blocked</Tag> : <Tag tone="green">Active</Tag>}</Row>
                <Row label="Availability">{donor.availability === 'available' ? 'Available to donate' : 'Not available right now'}</Row>
                <Row label="Location">{donor.location}</Row>
                <Row label="Last donation">
                  {formatDate(donor.lastDonation)}
                  <p className={`text-xs ${el.eligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {el.eligible ? 'Eligible to donate' : `Eligible again on ${formatDate(el.on)}`}
                  </p>
                </Row>
              </dl>

              <section aria-labelledby="history-h">
                <h3 id="history-h" className="mb-2 text-sm font-semibold text-slate-900">Donation history</h3>
                {loading && !detail ? (
                  <Skeleton className="h-16" />
                ) : !detail || detail.donations.length === 0 ? (
                  <p className="text-sm text-slate-500">No donations recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
                    {detail.donations.map((x) => (
                      <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="font-medium text-slate-800">{formatDate(x.date)}</span>
                        <span className="truncate text-slate-500">{x.hospital}, {x.units} {x.units === 1 ? 'unit' : 'units'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="part-h">
                <h3 id="part-h" className="mb-2 text-sm font-semibold text-slate-900">Emergency participation</h3>
                {loading && !detail ? (
                  <Skeleton className="h-16" />
                ) : !detail ? (
                  <p className="text-sm text-slate-500">Couldn’t load emergency history.</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Responded to <span className="font-medium text-slate-900">{detail.participation.responded}</span> emergency {detail.participation.responded === 1 ? 'request' : 'requests'}.
                    </p>
                    {detail.participation.items.length > 0 && (
                      <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
                        {detail.participation.items.map((x) => (
                          <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <BloodGroup group={x.group} />
                              <span className="truncate text-slate-700">{x.hospital}</span>
                            </span>
                            <RequestStatus status={x.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">
          {editing ? (
            <>
              <button type="button" className="btn" onClick={cancelEdit}>Cancel</button>
              <button type="submit" form="donor-edit-form" className="btn btn-primary">Save changes</button>
            </>
          ) : (
            <>
              {can('donor.block') && (
                <button className="btn btn-danger mr-auto" onClick={() => onBlock(donor)}>{blocked ? 'Unblock' : 'Block donor'}</button>
              )}
              {pending && !blocked && can('donor.verify') && (
                <button className="btn btn-primary" onClick={() => onSave(donor, { verification: 'verified' }, `${donor.name} verified`)}>Verify donor</button>
              )}
              {canEdit && (
                <button className="btn" onClick={() => setEditing(true)}>Edit details</button>
              )}
              {!canEdit && !can('donor.block') && <p className="text-sm text-slate-500">You have view-only access.</p>}
            </>
          )}
        </footer>
      </aside>
    </div>
  );
}