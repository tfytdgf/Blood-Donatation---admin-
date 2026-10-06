const BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';
export const MOCK_MODE = !BASE;

// Session. localStorage keeps this simple, but any XSS bug could read the token.
// For production, prefer an httpOnly cookie set by your backend.
export function getSession() {
  try {
    const user = JSON.parse(localStorage.getItem('admin_user'));
    return localStorage.getItem('admin_token') && user ? user : null;
  } catch {
    return null;
  }
}
export function saveSession(token, user) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}

async function http(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      message = (await res.json()).message || message;
    } catch {
      /* response had no JSON body */
    }
    throw Object.assign(new Error(message), { status: res.status });
  }
  return res.json();
}

// No REACT_APP_API_URL? Fall back to the sample data. It's loaded on demand,
// so it never ends up in the bundle you ship once the backend is connected.
const transport = BASE ? http : (path, opts) => import('../mock').then((m) => m.mockRequest(path, opts));

const PUBLIC = ['/auth/login', '/auth/verify-code', '/auth/forgot', '/auth/reset'];

async function call(path, opts) {
  try {
    return await transport(path, opts);
  } catch (err) {
    // An expired or rejected token sends the person back to the sign-in screen.
    if (err.status === 401 && !PUBLIC.includes(path)) {
      clearSession();
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw err;
  }
}

export const api = {
  login: (email, password) => call('/auth/login', { method: 'POST', body: { email, password } }),
  verifyCode: (challenge, code) => call('/auth/verify-code', { method: 'POST', body: { challenge, code } }),
  forgotPassword: (email) => call('/auth/forgot', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => call('/auth/reset', { method: 'POST', body: { token, password } }),
  changePassword: (current, next) => call('/auth/change-password', { method: 'POST', body: { current, next } }),
  setTwoFactor: (enabled, password) => call('/auth/two-factor', { method: 'POST', body: { enabled, password } }),
  wsTicket: () => call('/auth/ws-ticket', { method: 'POST' }),
  stats: () => call('/stats'),
  donors: (params) => call(`/donors?${new URLSearchParams(params)}`),
  donor: (id) => call(`/donors/${id}`),
  createDonor: (body) => call('/donors', { method: 'POST', body }),
  updateDonor: (id, patch) => call(`/donors/${id}`, { method: 'PATCH', body: patch }),
  bulkVerify: (ids) => call('/donors/bulk-verify', { method: 'POST', body: { ids } }),
  exportDonors: (params) => call(`/donors/export?${new URLSearchParams(params)}`),
  emergencies: () => call('/emergencies'),
  updateEmergency: (id, patch) => call(`/emergencies/${id}`, { method: 'PATCH', body: patch }),
  hospitals: () => call('/hospitals'),
  createHospital: (body) => call('/hospitals', { method: 'POST', body }),
  updateHospital: (id, patch) => call(`/hospitals/${id}`, { method: 'PATCH', body: patch }),
  inventory: () => call('/inventory'),
  updateStock: (group, body) => call(`/inventory/${encodeURIComponent(group)}`, { method: 'PATCH', body }),
  activity: () => call('/activity'),
  notifications: () => call('/notifications'),
  readNotifications: () => call('/notifications/read', { method: 'POST' }),
  getDoc: (name) => call(`/${name}`), // 'settings' | 'profile'
  saveDoc: (name, body) => call(`/${name}`, { method: 'PUT', body }),
};