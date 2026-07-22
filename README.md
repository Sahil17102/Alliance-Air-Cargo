# Alliance Air Cargo websites

Three independently deployable frontend applications are included.

The repository also includes the shared Node.js/PostgreSQL API used by all three applications. Render runs it from the root `Dockerfile`.

## 1. Public landing website

```bash
npm install
npm run dev
```

Local URL: `http://127.0.0.1:5173`

Production portal URL can be set with:

```env
VITE_CLIENT_PORTAL_URL=https://alliance-air-cargo-1-client-page.onrender.com
```

## 2. Client and employee portal

```bash
npm run dev:portal -- --host 127.0.0.1
```

Local URL: `http://127.0.0.1:5174`

Production landing URL can be set inside the portal with:

```env
VITE_LANDING_URL=https://alliance-air-cargo-1landing-page.onrender.com
```

Demo client login: `agent@alliancecargo.in` / `Cargo@123`

Demo employee login: `ops@alliancecargo.in` / `Ops@123`

Demo email OTP: `123456`

## Production builds

```bash
npm run build:all
```

The public output is generated in `dist/`. The portal output is generated in `client-portal/dist/`.

## 3. Super Admin console

```bash
npm run dev:admin -- --host 127.0.0.1
```

Local URL: `http://127.0.0.1:5175`

Demo Super Admin login: `superadmin@alliancecargo.in` / `Admin@123`

Demo 2FA code: `246810`

Production URLs can be configured inside the admin app with:

```env
VITE_SITE_URL=https://alliance-air-cargosuperadmin.onrender.com
VITE_API_BASE_URL=https://alliance-air-cargo.onrender.com
VITE_LANDING_URL=https://alliance-air-cargo-1landing-page.onrender.com
VITE_CLIENT_URL=https://alliance-air-cargo-1-client-page.onrender.com
```

The Super Admin output is generated in `super-admin/dist/`.

Render configuration is documented in `RENDER_ENV.md`. The shared backend endpoints required for real-time rate, booking, approval and shipment synchronization are documented in `API_CONTRACT.md`.

The backend currently provides database-backed quote requests, registrations, Super Admin agent approvals, client approval-status synchronization, bookings, shipments, prepaid wallets, wallet transaction ledgers, atomic booking deductions, client-owned employee credentials and permissions, admin wallet controls, admin state, rate calculation and secure cookie sessions. Pending registrations appear automatically in Super Admin Agent Management; approval is written back to PostgreSQL and unlocks client booking access. Verified clients create employee logins only from Client Portal → Employee Access. Employees can view, create, track or delete orders only when the client owner grants the corresponding permission; eligible wallet-paid deletions refund the owner wallet atomically. The Super Admin command centre includes direct operational shortcuts plus Fare Management, Commodity Management and Shipment/AWB Management; active commodity surcharges feed the server-side client freight calculator. The built-in top-up flow records a working prepaid credit for this deployment; a live payment gateway settlement/webhook should replace that demo credit step before accepting real money. SMTP/SMS OTP delivery and airline inventory providers still require their respective external provider credentials.
