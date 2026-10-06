# Backend contract

The front end already calls these endpoints (`src/api.js`). `src/mock.js` implements all of them,
including every rule below, so use it as the reference while building the real API.

**Every rule here must be enforced on the server.** The React app hides buttons by role, but anyone
can call your API directly, so hidden buttons protect nothing on their own.

## Auth
| Call | Notes |
|---|---|
| `POST /auth/login` `{email, password}` | Returns `{token, user:{name,email,role}}`. Wrong details: `401`. Rate-limit this route and lock after repeated failures. |
| Any other call | Send `Authorization: Bearer <token>`. Missing, invalid or expired token: `401` (the app signs the person out). |

Roles: `super_admin`, `verifier`, `viewer`. Prefer an httpOnly, SameSite cookie over localStorage for the token.

## Permissions (return `403` when missing)
| Action | super_admin | verifier | viewer |
|---|:-:|:-:|:-:|
| Read anything | yes | yes | yes |
| Edit donor details / availability | yes | yes | no |
| Change donor `verification` | yes | yes | no |
| Change donor `account` (block/unblock) | yes | no | no |
| Verify / assign / resolve emergency requests | yes | yes | no |
| `PUT /settings` | yes | no | no |
| `PUT /profile` (own profile) | yes | yes | yes |

## Endpoints
| Call | Returns / rules |
|---|---|
| `GET /stats` | `{totalDonors, available, pending, activeEmergencies}` |
| `GET /donors?search&group&groups&status&page&limit` | `{items, total}`. `search` matches name or phone digits. `groups` is a comma list (compatible groups). `status` is derived: `blocked` > `pending` (unverified) > `available`/`unavailable`. |
| `GET /donors/:id` | Donor plus `donations:[{id,date,hospital,units}]` and `participation:{responded, items:[{id,hospital,group,status,at}]}` |
| `PATCH /donors/:id` | Accept only `name, phone, group, location, availability, verification, account`. Validate (`422`). |
| `GET /emergencies` | Includes `lat`, `lng` of the hospital, `assignedTo`, `assignedDonorId`. |
| `PATCH /emergencies/:id` | Accept only `status, assignedDonorId`. Status may only move `open` > `verified` > `assigned` > `resolved` (else `409`). |
| `GET /hospitals`, `/inventory`, `/activity`, `/notifications` | Lists. Write an activity entry for every change. |
| `POST /notifications/read` | Marks all read. |
| `GET/PUT /settings` | `{orgName, lowStockPercent 5-80, donationGapDays 30-365, requireVerification, emailAlerts}` |
| `GET/PUT /profile` | `{name, email, phone, role}`. Role and email are not editable. |

Donor records store three separate fields: `verification` (`verified`/`pending`), `availability`
(`available`/`unavailable`) and `account` (`active`/`blocked`), plus `lat`, `lng` and `lastDonation`
(`YYYY-MM-DD`). Phones should include the country code, e.g. `+91 98765 43210`, so WhatsApp links work.

## Assignment rules (`409` on failure, with a readable `message`)
When `status` becomes `assigned`, the server must check that the donor:
1. is verified, active and available,
2. has a blood group compatible with the patient (same table as `COMPATIBLE_DONORS` in `src/donorRules.js`),
3. last donated at least `donationGapDays` ago.

## Live alerts
The app polls `GET /emergencies` every 30 seconds. For instant alerts, push over WebSockets or SSE and call
`window.dispatchEvent(new Event('data:refresh'))`.
