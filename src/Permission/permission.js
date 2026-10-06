// One place that says what each role may do. The server must enforce the same rules;
// this file only decides which buttons the UI shows.
export const ROLE_LABELS = { super_admin: 'Super admin', verifier: 'Verifier', viewer: 'Viewer' };

const PERMS = {
  super_admin: [
    'donor.create', 'donor.edit', 'donor.verify', 'donor.block', 'donor.export',
    'emergency.manage', 'hospital.manage', 'inventory.manage', 'settings.edit',
  ],
  verifier: ['donor.create', 'donor.edit', 'donor.verify', 'emergency.manage', 'inventory.manage'],
  viewer: [],
};

export const hasPerm = (role, perm) => Boolean(PERMS[role]?.includes(perm));