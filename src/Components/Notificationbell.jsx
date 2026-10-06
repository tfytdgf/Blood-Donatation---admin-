import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAsync, useLiveReload } from '../hooks';
import { Icon, timeAgo } from './UI';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { data, reload } = useAsync(api.notifications, []);
  useLiveReload(reload);
  const items = data || [];
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function markAllRead() {
    try {
      await api.readNotifications();
      reload();
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
      >
        <Icon name="bell" className="h-5 w-5 pointer-events-none" />
        {unread > 0 && (
          <span className="pointer-events-none select-none absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-red-700 hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">You’re all caught up.</li>}
            {items.map((n) => (
              <li key={n.id} className={`flex gap-3 px-4 py-3 text-left ${n.read ? '' : 'bg-red-50/50'}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-red-600'}`} />
                <div>
                  <p className="text-sm text-slate-800">{n.text}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{timeAgo(n.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}