import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './auth';
import { playAlert, setSound, soundOn, useLiveAlerts } from './alerts';
import { hasUnsavedChanges } from './hooks';
import { ROLE_LABELS } from './permissions';
import ErrorBoundary from './Components/Errorboundary';
import NotificationBell from './Components/Notificationbell';
import { Icon, Skeleton, initials } from './Components/UI';
import Login from './Pages/Login';

const pages = {
  dashboard: lazy(() => import('./Pages/Dashboard')),
  donors: lazy(() => import('./Pages/Donors')),
  emergencies: lazy(() => import('./Pages/Emergencies')),
  hospitals: lazy(() => import('./Pages/Hospitals')),
  inventory: lazy(() => import('./Pages/Inventory')),
  logs: lazy(() => import('./Pages/Logs')),
  settings: lazy(() => import('./Pages/Settings')),
  profile: lazy(() => import('./Pages/Profile')),
};

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'donors', label: 'Donors', icon: 'users' },
  { id: 'emergencies', label: 'Emergencies', icon: 'alert' },
  { id: 'hospitals', label: 'Hospitals', icon: 'building' },
  { id: 'inventory', label: 'Blood inventory', icon: 'drop' },
  { id: 'logs', label: 'Activity log', icon: 'list' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
];

const LIVE_LABEL = { live: 'Live', polling: 'Checking every 30s', connecting: 'Connecting' };
const LIVE_HINT = {
  live: 'New requests arrive instantly',
  polling: 'The live connection is down, so the app checks for new requests every 30 seconds',
  connecting: 'Connecting to live updates',
};

function useRoute() {
  const read = () => {
    const r = window.location.hash.replace('#/', '');
    return pages[r] ? r : 'dashboard';
  };
  const [route, setRoute] = useState(read);
  const current = useRef(route);

  useEffect(() => {
    const onChange = () => {
      const next = read();
      if (next === current.current) return;
      if (hasUnsavedChanges() && !window.confirm('You have unsaved changes. Leave this page and discard them?')) {
        window.location.hash = `#/${current.current}`;
        return;
      }
      current.current = next;
      setRoute(next);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

function Shell() {
  const route = useRoute();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fresh, setFresh] = useState([]);
  const [sound, setSoundState] = useState(soundOn);
  const Page = pages[route];
  const title = NAV.find((n) => n.id === route)?.label || 'Profile';

  useEffect(() => setMenuOpen(false), [route]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const liveMode = useLiveAlerts((items) => {
    setFresh((cur) => [...items, ...cur]);
    playAlert();
  });

  function toggleSound() {
    const next = !sound;
    setSound(next);
    setSoundState(next);
    if (next) {
      playAlert();
      toast.info('Alert sound turned ON');
    } else {
      toast.info('Alert sound turned OFF');
    }
  }

  const first = fresh[0];

  return (
    <div className="min-h-screen bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow">
        Skip to content
      </a>
      {menuOpen && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform lg:visible lg:translate-x-0 ${menuOpen ? 'translate-x-0' : 'invisible -translate-x-full'}`}>
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white">
            <Icon name="drop" className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Blood Network</p>
            <p className="text-xs text-slate-500">Admin console</p>
          </div>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#/${item.id}`}
              aria-current={route === item.id ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${route === item.id ? 'bg-red-50 font-medium text-red-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          <button className="btn btn-sm mt-2 w-full" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Icon name="menu" />
            </button>
            <h1 className="text-base font-semibold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-1 hidden items-center gap-1.5 text-xs text-slate-500 sm:flex" role="status" title={LIVE_HINT[liveMode]}>
              <span className={`h-2 w-2 rounded-full ${liveMode === 'live' ? 'bg-emerald-500' : liveMode === 'polling' ? 'bg-amber-500' : 'bg-slate-300'}`} />
              {LIVE_LABEL[liveMode]}
            </span>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label="Alert sound for new critical requests"
              title={sound ? 'Alert sound is on' : 'Alert sound is off'}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Icon name={sound ? 'volume' : 'mute'} className="h-5 w-5 pointer-events-none" />
            </button>
            <NotificationBell />
            <a href="#/profile" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200" aria-label="Your profile">
              {initials(user.name)}
            </a>
          </div>
        </header>

        {first && (
          <div role="alert" className="sticky top-14 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 bg-red-600 px-4 py-3 text-sm text-white sm:px-6">
            <p className="flex-1 font-medium">
              <span aria-hidden="true">🚨 </span>
              {fresh.length === 1
                ? `New critical request: ${first.group} blood, ${first.units} units at ${first.hospital}`
                : `${fresh.length} new critical requests need attention`}
            </p>
            <a href="#/emergencies" onClick={() => setFresh([])} className="rounded-md bg-white px-3 py-1 font-medium text-red-700 hover:bg-red-50">View requests</a>
            <button onClick={() => setFresh([])} className="underline">Dismiss</button>
          </div>
        )}

        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none sm:px-6">
          <ErrorBoundary key={route}>
            <Suspense fallback={<Skeleton className="h-64" />}>
              <Page />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { user } = useAuth();
  return user ? <Shell /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Gate />
      </ErrorBoundary>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar />
    </AuthProvider>
  );
}
