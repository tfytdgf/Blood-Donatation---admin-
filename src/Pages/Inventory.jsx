import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAsync, useConfirmClose, useLiveReload, useUnsavedWarning } from '../hooks';
import { BloodGroup, ErrorBox, Field, Modal, Skeleton, StockBar, isLow, timeAgo } from '../Components/UI';

const REASONS = ['Donation received', 'Issued to a hospital', 'Expired or discarded', 'Stock count correction'];

export default function Inventory() {
  const { can } = useAuth();
  const { data, error, reload } = useAsync(() => Promise.all([api.inventory(), api.getDoc('settings')]), []);
  useLiveReload(reload);
  const [editing, setEditing] = useState(null);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-72" />;

  const [items, settings] = data;
  const canManage = can('inventory.manage');
  const total = items.reduce((sum, i) => sum + i.units, 0);
  const low = items.filter((i) => isLow(i, settings.lowStockPercent));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {total} units in stock.{' '}
        {low.length > 0 ? (
          <span className="font-medium text-red-600">Running low on {low.map((i) => i.group).join(', ')}.</span>
        ) : (
          'All blood groups are above the low-stock level.'
        )}
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <caption className="sr-only">Blood inventory</caption>
            <thead>
              <tr>
                <th scope="col" className="th">Blood group</th>
                <th scope="col" className="th">Units</th>
                <th scope="col" className="th w-1/3">Capacity used</th>
                <th scope="col" className="th">Status</th>
                <th scope="col" className="th">Updated</th>
                {canManage && <th scope="col" className="th text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((i) => {
                const lowStock = isLow(i, settings.lowStockPercent);
                return (
                  <tr key={i.group} className={lowStock ? 'bg-red-50/50' : ''}>
                    <td className="td"><BloodGroup group={i.group} /></td>
                    <td className="td tabular-nums">{i.units} of {i.capacity}</td>
                    <td className="td"><div className="flex"><StockBar item={i} low={lowStock} /></div></td>
                    <td className="td">
                      <span className={lowStock ? 'font-medium text-red-600' : 'text-emerald-700'}>{lowStock ? 'Low stock' : 'Healthy'}</span>
                    </td>
                    <td className="td text-slate-500">{timeAgo(i.updatedAt)}</td>
                    {canManage && (
                      <td className="td text-right">
                        <button className="btn btn-sm" aria-label={`Update ${i.group} stock`} onClick={() => setEditing(i)}>Update stock</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <StockModal
          item={editing}
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

function StockModal({ item, onClose, onSaved }) {
  const [units, setUnits] = useState(String(item.units));
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = Number(units) !== item.units;
  useUnsavedWarning(dirty);
  const close = useConfirmClose(dirty, onClose);
  const n = Number(units);
  const delta = Number.isFinite(n) ? n - item.units : 0;

  async function submit(e) {
    e.preventDefault();
    if (units === '' || !Number.isInteger(n) || n < 0 || n > item.capacity) return setError(`Enter a whole number from 0 to ${item.capacity}`);
    if (!dirty) return onClose();
    setSaving(true);
    try {
      await api.updateStock(item.group, { units: n, reason });
      toast.success(`${item.group} stock set to ${n} units`);
      onSaved();
    } catch (err) {
      setError(err.message || 'Couldn’t update stock');
      setSaving(false);
    }
  }

  return (
    <Modal title={`Update ${item.group} stock`} onClose={close}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <p className="text-sm text-slate-600">Currently {item.units} of {item.capacity} units.</p>
        <Field label="Units in stock now" error={error}>
          <input type="number" min="0" max={item.capacity} className="input" value={units} onChange={(e) => { setUnits(e.target.value); setError(''); }} />
        </Field>
        {dirty && Number.isFinite(delta) && (
          <p className={`text-sm ${delta < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{delta > 0 ? `+${delta}` : delta} units</p>
        )}
        <Field label="Reason">
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}