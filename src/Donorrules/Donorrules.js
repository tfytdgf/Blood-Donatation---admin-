// Gap between whole-blood donations. Check your local blood-bank guidelines:
// many use 90 days for men and 120 for women. It can be changed in Settings.
export const DEFAULT_GAP_DAYS = 90;

export function eligibility(lastDonation, gapDays = DEFAULT_GAP_DAYS) {
  if (!lastDonation) return { eligible: true, on: null };
  const on = new Date(new Date(lastDonation).getTime() + gapDays * 864e5);
  return { eligible: on <= new Date(), on };
}

// Recipient group -> donor groups that can give red cells to them.
export const COMPATIBLE_DONORS = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

export function distanceKm(a, b) {
  if (a?.lat == null || b?.lat == null) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

// Eligible donors first, then same group before compatible (keeps O- for O- patients),
// then nearest to the hospital.
export function rankDonors(req, donors, gapDays) {
  return donors
    .map((d) => ({ ...d, ...eligibility(d.lastDonation, gapDays), km: distanceKm(d, req), exact: d.group === req.group }))
    .sort((a, b) => b.eligible - a.eligible || b.exact - a.exact || (a.km ?? 1e9) - (b.km ?? 1e9));
}

export const emergencyMessage = (req) =>
  `Urgent: ${req.group} blood needed at ${req.hospital}, ${req.location}. Can you donate today? Please reply YES or call the Blood Network.`;

// Donors store three separate facts: verification, availability and account.
// The table and filters show one combined label derived from them.
export const donorStatus = (d) =>
  d.account === 'blocked' ? 'blocked' : d.verification === 'pending' ? 'pending' : d.availability;