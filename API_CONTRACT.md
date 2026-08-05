# Shared API contract

For automatic cross-site synchronization, the backend is the single source of truth. PostgreSQL must never be accessed directly by a static frontend.

The backend implements these endpoints:

| Method | Endpoint | Consumer | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Render | Service health check |
| `POST` | `/api/quotes` | Landing | Save public quote request |
| `POST` | `/api/auth/login` | Client/Admin | Authenticate and issue secure session |
| `POST` | `/api/auth/register` | Client | Submit agent registration |
| `GET` | `/api/auth/me` | Client | Refresh the signed-in account and latest approval status |
| `GET` | `/api/admin/employees` | Super Admin | List every employee login and assigned client account |
| `POST` | `/api/admin/employees` | Super Admin | Create employee credentials, assign a client and set order permissions |
| `PATCH` | `/api/admin/employees/:id` | Super Admin | Change employee details, password, permissions or login status |
| `DELETE` | `/api/admin/employees/:id` | Super Admin | Permanently remove an employee login |
| `GET` | `/api/shipments` | Client | Load authenticated customer shipments |
| `POST` | `/api/bookings` | Client | Atomically create a cargo booking and debit its server-calculated freight from the wallet |
| `DELETE` | `/api/bookings/:awb` | Client | Delete an eligible booking and atomically refund wallet-paid freight |
| `POST` | `/api/rates/quote` | Client | Calculate live rate from admin-managed tariffs |
| `POST` | `/api/freight/calculate` | Client | Calculate booking weights, controlled surcharges, grand total and available flights |
| `GET` | `/api/agents/lookup/:accountNumber` | Client | Verify consignee account and auto-fill approved carrier/agent details |
| `GET` | `/api/wallet` | Client | Load the authenticated client's wallet and transaction ledger |
| `POST` | `/api/wallet/top-up` | Client | Add prepaid funds and record a credit transaction |
| `GET` | `/api/admin/bootstrap` | Super Admin | Load users, agents, rates, flights, wallets and operational state |
| `PATCH` | `/api/admin/agents/:id/status` | Super Admin | Approve, reject or suspend a registered agent and sync the client account |
| `POST` | `/api/admin/wallets/:email/adjust` | Super Admin | Credit or debit a client wallet with a required audit note |
| `PATCH` | `/api/admin/wallets/:email/status` | Super Admin | Freeze or reactivate a client wallet |
| `PATCH` | `/api/admin/state` | Super Admin | Persist an updated admin module |

All authenticated requests use `credentials: include`. The backend must allow the exact frontend origins, return `Access-Control-Allow-Credentials: true`, use secure cookies with `SameSite=None`, validate roles server-side and never trust a role sent by a browser.

Employee accounts have no built-in/demo credentials. Only Super Admin creates each employee login inside Super Admin → Employee Access, assigns its client/agent owner, and grants `viewShipments`, `createBooking`, `deleteBooking`, `trackShipments` and/or `viewWallet`. Agent sessions cannot access employee-management endpoints. Every protected employee request reloads the employee's current status and permissions from PostgreSQL and scopes data to the assigned client account.

The browser keeps local storage as a temporary display fallback when the API is unavailable. Production wallet balances, wallet transactions and booking deductions are always enforced and stored atomically in PostgreSQL by the backend.

Fare, charge and commodity records are maintained from the Super Admin console. Active commodity surcharges are read from the shared `admin_state` store during server-side freight calculation, so client booking totals update after an administrator saves a commodity change.

Active Super Admin rate cards are matched server-side by origin, destination, commodity, effective date and chargeable-weight slab. A matching card controls base rate, minimum freight, volumetric divisor, fuel/sector/handling and X-ray charges in both `/api/rates/quote` and `/api/freight/calculate`; the default calculator controls remain the fallback when no card matches. NDR/RTO exceptions and weight-audit records are stored in the same authenticated admin state, while wallet recharges, debits, booking deductions and refunds remain in the PostgreSQL wallet transaction ledger.
