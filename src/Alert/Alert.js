import { useEffect, useRef, useState } from 'react';
import { api, MOCK_MODE } from '../api';

const WS_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_URL) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) || ''; // e.g. wss://api.yourdomain.org/live
const POLL_MS = 30000;

export const soundOn = () => localStorage.getItem('alert_sound') !== 'off';
export const setSound = (on) => localStorage.setItem('alert_sound', on ? 'on' : 'off');

let audio;
// Three short beeps, generated in the browser so there's no audio file to load.
// Browsers only allow sound after the person has clicked something once.
export function playAlert() {
  if (!soundOn()) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    [0, 0.35, 0.7].forEach((offset, i) => {
      const t = audio.currentTime + offset;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = i === 1 ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* audio not allowed yet */
  }
}

// Instant alerts over a WebSocket, with polling as the safety net:
//   live        socket open: events arrive instantly, a slow poll double-checks every 2 minutes
//   polling     socket down: polls every 30 seconds while it reconnects (1s, 2s, 4s... up to 30s)
//   connecting  first connection attempt
// Server messages look like { type: 'emergency.created' | 'emergency.updated', data: request }.
// New critical requests go to onNew; every change refreshes whatever page is open.
export function useLiveAlerts(onNew) {
  const [mode, setMode] = useState('connecting');
  const handler = useRef(onNew);
  handler.current = onNew;

  useEffect(() => {
    let stopped = false;
    let live = false;
    let primed = false;
    let signature = '';
    let tick = 0;
    let socket;
    let retryTimer;
    let retries = 0;
    let unsubscribe;
    const seen = new Set();

    const refresh = () => window.dispatchEvent(new Event('data:refresh'));
    const announce = (list) => {
      const fresh = list.filter((r) => r.critical && r.status !== 'resolved' && !seen.has(r.id));
      list.forEach((r) => seen.add(r.id));
      if (fresh.length) handler.current(fresh);
    };
    const onEvent = (evt) => {
      if (evt.type === 'emergency.created') announce([evt.data]);
      refresh();
    };

    async function poll() {
      if (document.hidden) return;
      try {
        const list = await api.emergencies();
        const next = list.map((r) => `${r.id}:${r.status}`).join(',');
        if (primed) {
          announce(list);
          if (next !== signature) refresh();
        } else {
          list.forEach((r) => seen.add(r.id));
        }
        primed = true;
        signature = next;
      } catch {
        /* a failed poll just waits for the next one; 401s are handled in api.js */
      }
    }

    function reconnectLater() {
      live = false;
      if (stopped) return;
      setMode('polling');
      retryTimer = setTimeout(connect, Math.min(30000, 1000 * 2 ** retries));
      retries += 1;
    }

    async function connect() {
      if (stopped) return;
      try {
        const { ticket } = await api.wsTicket(); // short-lived, one-use ticket, so the real token never sits in a URL
        if (stopped) return;
        socket = new WebSocket(`${WS_URL}?ticket=${encodeURIComponent(ticket)}`);
        socket.onopen = () => {
          retries = 0;
          live = true;
          setMode('live');
          poll(); // catch anything missed while disconnected
        };
        socket.onmessage = (m) => {
          try {
            onEvent(JSON.parse(m.data));
          } catch {
            /* ignore malformed messages */
          }
        };
        socket.onclose = reconnectLater;
        socket.onerror = () => socket.close();
      } catch {
        reconnectLater();
      }
    }

    if (WS_URL) {
      connect();
    } else if (MOCK_MODE) {
      // Sample mode: the fake backend pushes events the way a socket would.
      import('../mock').then((m) => {
        if (stopped) return;
        unsubscribe = m.subscribeLive(onEvent);
        live = true;
        setMode('live');
      });
    } else {
      setMode('polling');
    }

    poll();
    const timer = setInterval(() => {
      tick += 1;
      if (!live || tick % 4 === 0) poll();
    }, POLL_MS);
    document.addEventListener('visibilitychange', poll);

    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', poll);
      if (unsubscribe) unsubscribe();
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  return mode;
}