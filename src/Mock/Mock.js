// Sample data + a small router that mimics the REST API in api.js, including the
// permission, validation and business rules your real backend must enforce.
// Delete this file once your backend does the same (see API.md).
import { COMPATIBLE_DONORS, donorStatus, eligibility } from '../donorRules';
import { hasPerm } from '../permissions';
import { passwordProblem } from '../passwords';

const DAY = 864e5;
const hoursAgo = (h) => new Date(Date.now() - h * 36e5).toISOString();
const httpError = (status, message) => Object.assign(new Error(message), { status });
const fmtDay = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
const first = ['Aarav', 'Priya', 'Rohan', 'Sneha', 'Imran', 'Kavya', 'Arjun', 'Neha', 'Faizan', 'Ritika', 'Manish', 'Pooja', 'Sahil', 'Anjali', 'Vikram', 'Meera'];
const last = ['Sharma', 'Verma', 'Khan', 'Singh', 'Gupta', 'Yadav', 'Mishra', 'Patel'];
const cities = ['Lucknow', 'Kanpur', 'Varanasi', 'Prayagraj', 'Noida', 'Agra'];
const CITY = {
  Lucknow: [26.8467, 80.9462], Kanpur: [26.4499, 80.3319], Varanasi: [25.3176, 82.9739],
  Prayagraj: [25.4358, 81.8463], Noida: [28.5355, 77.391], Agra: [27.1767, 78.0081],
};
const near = (city, k) => ({ lat: +(CITY[city][0] + k / 1000).toFixed(4), lng: +(CITY[city][1] - k / 1000).toFixed(4) });

const accounts = [
  { email: 'admin@bloodnetwork.org', password: 'admin123', name: 'Ananya Rao', phone: '+91 98100 22334', role: 'super_admin', twoFactor: true },
  { email: 'verifier@bloodnetwork.org', password: 'verify123', name: 'Rohit Mehra', phone: '+91 98100 55120', role: 'verifier', twoFactor: true },
  { email: 'viewer@bloodnetwork.org', password: 'view123', name: 'Divya Nair', phone: '+91 98100 77031', role: 'viewer', twoFactor: false },
];

const FIELDS = {
  available: { verification: 'verified', availability: 'available', account: 'active' },
  unavailable: { verification: 'verified', availability: 'unavailable', account: 'active' },
  pending: { verification: 'pending', availability: 'available', account: 'active' },
  blocked: { verification: 'verified', availability: 'unavailable', account: 'blocked' },
};
const pattern = ['available', 'available', 'unavailable', 'pending', 'available', 'unavailable', 'blocked'];

const donors = Array.from({ length: 48 }, (_, i) => {
  const location = cities[i % 6];
  return {
    id: i + 1,
    name: `${first[i % 16]} ${last[(i * 3 + Math.floor(i / 16)) % 8]}`,
    phone: `+91 ${98000 + ((i * 37) % 1999)} ${10000 + ((i * 7919) % 89999)}`,
    group: GROUPS[(i * 5 + (i % 3)) % 8],
    location,
    ...near(location, ((i * 17) % 100) - 50),
    ...FIELDS[pattern[i % 7]],
    lastDonation: i % 9 === 0 ? null : new Date(Date.now() - (20 + ((i * 13) % 200)) * DAY).toISOString().slice(0, 10),
  };
});

const hospitals = [
  { id: 1, name: 'City General Hospital', city: 'Lucknow', contact: 'Dr. Anil Kapoor', phone: '+91 522 400 1180', unitsMonth: 64 },
  { id: 2, name: 'Ganga Medical Centre', city: 'Kanpur', contact: 'Dr. Seema Bajpai', phone: '+91 512 300 4412', unitsMonth: 41 },
  { id: 3, name: 'Sunrise Trauma Hospital', city: 'Lucknow', contact: 'Dr. Rakesh Jain', phone: '+91 522 411 7766', unitsMonth: 38 },
  { id: 4, name: 'Kashi Care Hospital', city: 'Varanasi', contact: 'Dr. Nidhi Pandey', phone: '+91 542 220 9034', unitsMonth: 27 },
  { id: 5, name: 'Noida Sector 12 Hospital', city: 'Noida', contact: 'Dr. Karan Malhotra', phone: '+91 120 455 2210', unitsMonth: 33 },
  { id: 6, name: 'Agra Heart Institute', city: 'Agra', contact: 'Dr. Farhan Ali', phone: '+91 562 280 3345', unitsMonth: 19 },
].map((h, i) => ({ ...h, ...near(h.city, 8 + i) }));

const withPlace = (e) => {
  const h = hospitals.find((x) => x.name === e.hospital);
  return { assignedTo: null, assignedDonorId: null, ...e, location: h.city, lat: h.lat, lng: h.lng };
};

const emergencies = [
  { id: 1, patient: 'Ramesh Tiwari', hospital: 'City General Hospital', group: 'O-', units: 4, status: 'open', critical: true, createdAt: hoursAgo(1) },
  { id: 2, patient: 'Sunita Devi', hospital: 'Ganga Medical Centre', group: 'B+', units: 2, status: 'verified', critical: true, createdAt: hoursAgo(3) },
  { id: 3, patient: 'Mohit Saxena', hospital: 'Sunrise Trauma Hospital', group: 'AB-', units: 3, status: 'open', critical: true, createdAt: hoursAgo(0.7) },
  { id: 4, patient: 'Farah Naaz', hospital: 'Kashi Care Hospital', group: 'A+', units: 2, status: 'assigned', critical: false, createdAt: hoursAgo(6), assignedTo: donors[2].name, assignedDonorId: donors[2].id },
  { id: 5, patient: 'Deepak Rawat', hospital: 'Noida Sector 12 Hospital', group: 'O+', units: 1, status: 'open', critical: false, createdAt: hoursAgo(9) },
  { id: 6, patient: 'Asha Kumari', hospital: 'Agra Heart Institute', group: 'B-', units: 2, status: 'resolved', critical: false, createdAt: hoursAgo(30), assignedTo: donors[12].name, assignedDonorId: donors[12].id },
].map(withPlace);

const stock = [42, 38, 27, 12, 9, 15, 6, 4];
const inventory = GROUPS.map((group, i) => ({ group, units: stock[i], capacity: 60, updatedAt: hoursAgo(2 + i * 5) }));

const activity = [
  { id: 1, at: hoursAgo(0.5), actor: 'Ananya Rao', action: 'verified donor', target: 'Imran Khan' },
  { id: 2, at: hoursAgo(1.5), actor: 'Ananya Rao', action: 'marked request as verified for', target: 'Sunita Devi' },
  { id: 3, at: hoursAgo(4), actor: 'Rohit Mehra', action: 'edited details of', target: 'Kavya Singh' },
  { id: 4, at: hoursAgo(7), actor: 'Ananya Rao', action: 'marked request as assigned for', target: 'Farah Naaz' },
  { id: 5, at: hoursAgo(11), actor: 'Ananya Rao', action: 'blocked donor', target: 'Manish Yadav' },
  { id: 6, at: hoursAgo(26), actor: 'Ananya Rao', action: 'marked request as resolved for', target: 'Asha Kumari' },
  { id: 7, at: hoursAgo(30), actor: 'Ananya Rao', action: 'updated', target: 'settings' },
  { id: 8, at: hoursAgo(49), actor: 'Rohit Mehra', action: 'verified donor', target: 'Pooja Mishra' },
];

const notifications = [
  { id: 1, text: 'New critical request: AB- blood needed at Sunrise Trauma Hospital', at: hoursAgo(0.7), read: false },
  { id: 2, text: 'B- stock has dropped to 6 units', at: hoursAgo(5), read: false },
  { id: 3, text: 'Donors are waiting for verification', at: hoursAgo(8), read: false },
  { id: 4, text: 'Request for Asha Kumari was resolved', at: hoursAgo(26), read: true },
];

const settings = { orgName: 'Blood Network', lowStockPercent: 25, donationGapDays: 90, requireVerification: true, emailAlerts: false };

// ---- helpers ---------------------------------------------------------------

const PHONE_RE = /^\+?[0-9 ]{10,15}$/;
const digits = (v) => String(v).replace(/\D/g, '');
const currentUser = () => {
  const [, email] = (localStorage.getItem('admin_token') || '').split('|');
  return accounts.find((a) => a.email === email);
};
const need = (me, perm) => {
  if (!hasPerm(me.role, perm)) throw httpError(403, 'Your role can’t do this. Ask a super admin.');
};
const record = (me, action, target) =>
  activity.unshift({ id: Date.now() + Math.random(), at: new Date().toISOString(), actor: me.name, action, target });
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
const changed = (current, patch) => Object.keys(patch).filter((k) => patch[k] !== current[k]);
const coords = (city) => {
  const key = Object.keys(CITY).find((c) => c.toLowerCase() === String(city).trim().toLowerCase());
  return key ? near(key, 0) : { lat: null, lng: null }; // a real backend should geocode the address
};

// Live events (what a WebSocket would push). live.js subscribes to this in sample mode.
const bus = new Set();
export const subscribeLive = (cb) => {
  bus.add(cb);
  return () => bus.delete(cb);
};
const emit = (evt) => bus.forEach((cb) => cb(evt));

// ---- auth ------------------------------------------------------------------

const attempts = {};
const challenges = new Map();
const resetTokens = new Map();
const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const session = (a) => ({ token: `mock|${a.email}`, user: { name: a.name, email: a.email, role: a.role } });

function auth(action, body) {
  if (action === 'login') {
    const email = String(body.email || '').trim().toLowerCase();
    const state = attempts[email] || { count: 0, until: 0 };
    if (state.until > Date.now()) throw httpError(429, 'Too many attempts. Try again in a minute.');
    const acct = accounts.find((a) => a.email === email && a.password === body.password);
    if (!acct) {
      state.count += 1;
      if (state.count >= 5) Object.assign(state, { count: 0, until: Date.now() + 60000 });
      attempts[email] = state;
      throw httpError(401, 'Wrong email or password');
    }
    attempts[email] = { count: 0, until: 0 };
    if (!acct.twoFactor) return session(acct);
    const challenge = randomId();
    challenges.set(challenge, { email, tries: 0 });
    return { twoFactor: true, challenge };
  }

  if (action === 'verify-code') {
    const entry = challenges.get(body.challenge);
    if (!entry) throw httpError(401, 'That sign-in expired. Start again.');
    // Sample mode accepts 123456. Your server must check a real one-time code (TOTP).
    if (String(body.code).trim() !== '123456') {
      entry.tries += 1;
      if (entry.tries >= 3) {
        challenges.delete(body.challenge);
        throw httpError(401, 'Too many wrong codes. Sign in again.');
      }
      throw httpError(401, 'That code isn’t right. Try again.');
    }
    challenges.delete(body.challenge);
    return session(accounts.find((a) => a.email === entry.email));
  }

  if (action === 'forgot') {
    // Always answer the same way so nobody can find out which emails have accounts.
    const acct = accounts.find((a) => a.email === String(body.email || '').trim().toLowerCase());
    const out = { ok: true };
    if (acct) {
      const token = randomId();
      resetTokens.set(token, { email: acct.email, expires: Date.now() + 30 * 60000 });
      out.demoToken = token; // sample mode only: a real server emails the link and returns nothing else
    }
    return out;
  }

  if (action === 'reset') {
    const entry = resetTokens.get(body.token);
    if (!entry || entry.expires < Date.now()) throw httpError(400, 'This reset link has expired. Ask for a new one.');
    const problem = passwordProblem(String(body.password || ''));
    if (problem) throw httpError(422, problem);
    accounts.find((a) => a.email === entry.email).password = body.password;
    resetTokens.delete(body.token);
    return { ok: true };
  }

  const me = currentUser();
  if (!me) throw httpError(401, 'Please sign in again');

  if (action === 'change-password') {
    if (me.password !== body.current) throw httpError(422, 'Your current password is wrong');
    const problem = passwordProblem(String(body.next || ''));
    if (problem) throw httpError(422, problem);
    if (body.next === body.current) throw httpError(422, 'Choose a different password');
    me.password = body.next;
    record(me, 'changed their', 'password');
    return { ok: true };
  }

  if (action === 'two-factor') {
    if (me.password !== body.password) throw httpError(422, 'Your password is wrong');
    if (!body.enabled && me.role === 'super_admin') throw httpError(409, 'Super admins must keep two-step sign-in on');
    me.twoFactor = Boolean(body.enabled);
    record(me, body.enabled ? 'turned on two-step sign-in for' : 'turned off two-step sign-in for', 'their account');
    return { twoFactor: me.twoFactor };
  }

  if (action === 'ws-ticket') return { ticket: randomId() }; // a real server issues a one-use, short-lived ticket

  throw httpError(404, `Unknown endpoint /auth/${action}`);
}

// ---- donors ----------------------------------------------------------------

function validateDonor(p, requireAll = false) {
  const has = (k) => requireAll || k in p;
  if (has('name') && !String(p.name ?? '').trim()) throw httpError(422, 'Name is required');
  if (has('phone') && !PHONE_RE.test(String(p.phone ?? '').trim())) throw httpError(422, 'Enter a valid phone number');
  if (has('group') && !GROUPS.includes(p.group)) throw httpError(422, 'Unknown blood group');
  if (has('location') && !String(p.location ?? '').trim()) throw httpError(422, 'Location is required');
  if (p.availability && !['available', 'unavailable'].includes(p.availability)) throw httpError(422, 'Invalid availability');
  if (p.verification && !['verified', 'pending'].includes(p.verification)) throw httpError(422, 'Invalid verification status');
  if (p.account && !['active', 'blocked'].includes(p.account)) throw httpError(422, 'Invalid account status');
  if (p.lastDonation && (!/^\d{4}-\d{2}-\d{2}$/.test(p.lastDonation) || new Date(p.lastDonation) > new Date())) {
    throw httpError(422, 'Last donation must be a past date');
  }
}

function filterDonors({ search = '', group = '', groups = '', status = '' }) {
  const term = search.trim().toLowerCase();
  const num = digits(term);
  const groupList = groups ? groups.split(',') : null;
  return donors.filter(
    (d) =>
      (!group || d.group === group) &&
      (!groupList || groupList.includes(d.group)) &&
      (!status || donorStatus(d) === status) &&
      (!term || d.name.toLowerCase().includes(term) || (num && digits(d.phone).includes(num)))
  );
}

function listDonors(query) {
  const { page = 1, limit = 10 } = query;
  const rows = filterDonors(query);
  const start = (Number(page) - 1) * Number(limit);
  return { items: rows.slice(start, start + Number(limit)), total: rows.length };
}

const donationsFor = (d) =>
  d.lastDonation
    ? Array.from({ length: 1 + (d.id % 4) }, (_, k) => ({
        id: `${d.id}-${k}`,
        date: new Date(new Date(d.lastDonation).getTime() - k * (105 + (d.id % 3) * 15) * DAY).toISOString().slice(0, 10),
        hospital: hospitals[(d.id + k) % hospitals.length].name,
        units: 1,
      }))
    : [];

function participationFor(d) {
  const items = emergencies
    .filter((e) => e.assignedDonorId === d.id)
    .map((e) => ({ id: e.id, hospital: e.hospital, group: e.group, status: e.status, at: e.createdAt }));
  return { responded: (d.id % 3) + items.length, items };
}

function createDonor(me, body) {
  need(me, 'donor.create');
  validateDonor(body, true);
  if (body.markVerified) need(me, 'donor.verify');
  if (donors.some((d) => digits(d.phone) === digits(body.phone))) throw httpError(409, 'A donor with this phone number already exists');
  const donor = {
    id: Math.max(...donors.map((d) => d.id)) + 1,
    name: body.name.trim(),
    phone: body.phone.trim(),
    group: body.group,
    location: body.location.trim(),
    ...coords(body.location),
    verification: body.markVerified ? 'verified' : 'pending',
    availability: 'available',
    account: 'active',
    lastDonation: body.lastDonation || null,
  };
  donors.unshift(donor);
  record(me, 'added donor', donor.name);
  return donor;
}

function patchDonor(me, id, body) {
  const donor = donors.find((d) => d.id === Number(id));
  if (!donor) throw httpError(404, 'Donor not found');
  // Only these fields can be changed. Anything else in the body is ignored.
  const patch = pick(body, ['name', 'phone', 'group', 'location', 'availability', 'verification', 'account']);
  validateDonor(patch);
  if (patch.phone && donors.some((d) => d.id !== donor.id && digits(d.phone) === digits(patch.phone))) {
    throw httpError(409, 'Another donor already has this phone number');
  }

  const diff = changed(donor, patch);
  if (diff.includes('account')) need(me, 'donor.block');
  if (diff.includes('verification')) need(me, 'donor.verify');
  if (diff.some((k) => !['account', 'verification'].includes(k))) need(me, 'donor.edit');

  Object.assign(donor, patch);
  const action = diff.includes('account')
    ? patch.account === 'blocked' ? 'blocked donor' : 'unblocked donor'
    : diff.includes('verification') ? 'verified donor' : 'edited details of';
  if (diff.length) record(me, action, donor.name);
  return donor;
}

function bulkVerify(me, body) {
  need(me, 'donor.verify');
  const ids = Array.isArray(body.ids) ? body.ids.slice(0, 100).map(Number) : [];
  let verified = 0;
  ids.forEach((id) => {
    const d = donors.find((x) => x.id === id);
    if (d && d.verification === 'pending' && d.account === 'active') {
      d.verification = 'verified';
      verified += 1;
    }
  });
  if (verified) record(me, 'verified', `${verified} pending ${verified === 1 ? 'donor' : 'donors'}`);
  return { verified, skipped: ids.length - verified };
}

function exportDonors(me, query) {
  need(me, 'donor.export');
  const items = filterDonors(query);
  record(me, 'exported the donor list with', `${items.length} ${items.length === 1 ? 'donor' : 'donors'}`);
  return { items };
}

// ---- emergencies, hospitals, inventory, settings ---------------------------

const NEXT = { open: 'verified', verified: 'assigned', assigned: 'resolved' };

function patchEmergency(me, id, body) {
  need(me, 'emergency.manage');
  const req = emergencies.find((e) => e.id === Number(id));
  if (!req) throw httpError(404, 'Request not found');
  const patch = pick(body, ['status', 'assignedTo', 'assignedDonorId']);

  if (patch.status && NEXT[req.status] !== patch.status) {
    throw httpError(409, `A ${req.status} request can’t be marked ${patch.status}`);
  }
  if (patch.status === 'assigned') {
    const donor = donors.find((d) => d.id === Number(patch.assignedDonorId));
    if (!donor || donorStatus(donor) !== 'available') throw httpError(409, 'This donor is not available for assignment');
    if (!COMPATIBLE_DONORS[req.group].includes(donor.group)) throw httpError(409, `${donor.group} blood can’t be given to a ${req.group} patient`);
    const { eligible, on } = eligibility(donor.lastDonation, settings.donationGapDays);
    if (!eligible) throw httpError(409, `${donor.name} donated recently and is eligible again on ${fmtDay(on)}`);
    patch.assignedTo = donor.name;
  }
  Object.assign(req, patch);
  record(me, `marked request as ${req.status} for`, req.patient);
  emit({ type: 'emergency.updated', data: req });
  return req;
}

function validateHospital(p, requireAll) {
  const has = (k) => requireAll || k in p;
  if (has('name') && !String(p.name ?? '').trim()) throw httpError(422, 'Hospital name is required');
  if (has('city') && !String(p.city ?? '').trim()) throw httpError(422, 'City is required');
  if (has('contact') && !String(p.contact ?? '').trim()) throw httpError(422, 'Contact person is required');
  if (has('phone') && !/^\+?[0-9 ]{6,15}$/.test(String(p.phone ?? '').trim())) throw httpError(422, 'Enter a valid phone number');
}

function createHospital(me, body) {
  need(me, 'hospital.manage');
  validateHospital(body, true);
  if (hospitals.some((h) => h.name.toLowerCase() === body.name.trim().toLowerCase())) throw httpError(409, 'A hospital with this name already exists');
  const hospital = {
    id: Math.max(...hospitals.map((h) => h.id)) + 1,
    ...pick(body, ['name', 'city', 'contact', 'phone']),
    unitsMonth: 0,
    ...coords(body.city),
  };
  hospitals.push(hospital);
  record(me, 'added hospital', hospital.name);
  return hospital;
}

function patchHospital(me, id, body) {
  need(me, 'hospital.manage');
  const h = hospitals.find((x) => x.id === Number(id));
  if (!h) throw httpError(404, 'Hospital not found');
  const patch = pick(body, ['name', 'city', 'contact', 'phone']);
  validateHospital(patch, false);
  if (patch.name && hospitals.some((x) => x.id !== h.id && x.name.toLowerCase() === patch.name.trim().toLowerCase())) {
    throw httpError(409, 'A hospital with this name already exists');
  }
  if (patch.name) emergencies.forEach((e) => e.hospital === h.name && (e.hospital = patch.name.trim()));
  Object.assign(h, patch, patch.city ? coords(patch.city) : {});
  record(me, 'edited hospital', h.name);
  return h;
}

const STOCK_REASONS = ['Donation received', 'Issued to a hospital', 'Expired or discarded', 'Stock count correction'];

function patchStock(me, group, body) {
  need(me, 'inventory.manage');
  const item = inventory.find((i) => i.group === group);
  if (!item) throw httpError(404, 'Unknown blood group');
  const units = Number(body.units);
  if (!Number.isInteger(units) || units < 0 || units > item.capacity) throw httpError(422, `Units must be a whole number from 0 to ${item.capacity}`);
  if (!STOCK_REASONS.includes(body.reason)) throw httpError(422, 'Choose a reason for the change');
  const before = item.units;
  Object.assign(item, { units, updatedAt: new Date().toISOString() });
  if (before !== units) record(me, `updated ${group} stock (${body.reason.toLowerCase()}) from ${before} to ${units} units for`, 'the blood bank');
  return item;
}

function patchSettings(me, body) {
  need(me, 'settings.edit');
  const pct = Number(body.lowStockPercent);
  const gap = Number(body.donationGapDays);
  if (!(pct >= 5 && pct <= 80)) throw httpError(422, 'Low-stock level must be between 5% and 80%');
  if (!(gap >= 30 && gap <= 365)) throw httpError(422, 'Donation gap must be between 30 and 365 days');
  Object.assign(settings, pick(body, ['orgName', 'requireVerification', 'emailAlerts']), { lowStockPercent: pct, donationGapDays: gap });
  record(me, 'updated', 'settings');
  return settings;
}

function route(me, resource, id, method, query, body) {
  switch (resource) {
    case 'stats':
      return {
        totalDonors: donors.length,
        available: donors.filter((d) => donorStatus(d) === 'available').length,
        pending: donors.filter((d) => d.verification === 'pending' && d.account === 'active').length,
        activeEmergencies: emergencies.filter((e) => e.status !== 'resolved').length,
      };
    case 'donors':
      if (method === 'POST') return id === 'bulk-verify' ? bulkVerify(me, body) : createDonor(me, body);
      if (method === 'PATCH') return patchDonor(me, id, body);
      if (id === 'export') return exportDonors(me, query);
      if (id) {
        const d = donors.find((x) => x.id === Number(id));
        if (!d) throw httpError(404, 'Donor not found');
        return { ...d, donations: donationsFor(d), participation: participationFor(d) };
      }
      return listDonors(query);
    case 'emergencies':
      if (method === 'PATCH') patchEmergency(me, id, body);
      return [...emergencies].sort(
        (a, b) => (b.critical && b.status !== 'resolved') - (a.critical && a.status !== 'resolved') || new Date(b.createdAt) - new Date(a.createdAt)
      );
    case 'hospitals':
      if (method === 'POST') return createHospital(me, body);
      if (method === 'PATCH') return patchHospital(me, id, body);
      return hospitals.map((h) => ({ ...h, active: emergencies.filter((e) => e.hospital === h.name && e.status !== 'resolved').length }));
    case 'inventory':
      return method === 'PATCH' ? patchStock(me, id, body) : inventory;
    case 'activity':
      return activity;
    case 'notifications':
      if (method === 'POST') notifications.forEach((n) => (n.read = true));
      return notifications;
    case 'settings':
      return method === 'PUT' ? patchSettings(me, body) : settings;
    case 'profile': {
      if (method === 'PUT') {
        const name = String(body.name || '').trim();
        if (!name) throw httpError(422, 'Name is required');
        Object.assign(me, { name, phone: body.phone ?? me.phone });
        record(me, 'updated', 'profile');
      }
      return { name: me.name, email: me.email, phone: me.phone, role: me.role, twoFactor: me.twoFactor };
    }
    default:
      throw httpError(404, `Unknown endpoint /${resource}`);
  }
}

// Demo only: a new critical request is pushed ~45s after the first call, so you can
// see the live alert (banner + sound) without a backend.
let demoScheduled = false;
function scheduleDemoRequest() {
  if (demoScheduled) return;
  demoScheduled = true;
  setTimeout(() => {
    const req = withPlace({ id: 7, patient: 'Vandana Pal', hospital: 'Ganga Medical Centre', group: 'A-', units: 2, status: 'open', critical: true, createdAt: new Date().toISOString() });
    emergencies.push(req);
    notifications.unshift({ id: 99, text: 'New critical request: A- blood needed at Ganga Medical Centre', at: new Date().toISOString(), read: false });
    emit({ type: 'emergency.created', data: JSON.parse(JSON.stringify(req)) });
  }, 45000);
}

export async function mockRequest(path, { method = 'GET', body } = {}) {
  scheduleDemoRequest();
  await new Promise((r) => setTimeout(r, 180));
  const url = new URL(path, 'http://mock');
  const [, resource, rawId] = url.pathname.split('/');
  const id = rawId ? decodeURIComponent(rawId) : rawId;
  const query = Object.fromEntries(url.searchParams);
  if (resource === 'auth') return JSON.parse(JSON.stringify(auth(id, body || {})));
  const me = currentUser();
  if (!me) throw httpError(401, 'Please sign in again');
  return JSON.parse(JSON.stringify(route(me, resource, id, method, query, body || {})));
}