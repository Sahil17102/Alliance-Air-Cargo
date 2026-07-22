# Shared API contract

For automatic cross-site synchronization, the backend is the single source of truth. PostgreSQL must never be accessed directly by a static frontend.

The backend implements these endpoints:

| Method | Endpoint | Consumer | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Render | Service health check |
| `POST` | `/api/quotes` | Landing | Save public quote request |
| `POST` | `/api/auth/login` | Client/Admin | Authenticate and issue secure session |
| `POST` | `/api/auth/register` | Client | Submit agent registration |
| `GET` | `/api/shipments` | Client | Load authenticated customer shipments |
| `POST` | `/api/bookings` | Client | Create cargo booking |
| `POST` | `/api/rates/quote` | Client | Calculate live rate from admin-managed tariffs |
| `POST` | `/api/freight/calculate` | Client | Calculate booking weights, controlled surcharges, grand total and available flights |
| `GET` | `/api/agents/lookup/:accountNumber` | Client | Verify consignee account and auto-fill approved carrier/agent details |
| `GET` | `/api/admin/bootstrap` | Super Admin | Load users, agents, rates, flights and operational state |
| `PATCH` | `/api/admin/state` | Super Admin | Persist an updated admin module |

All authenticated requests use `credentials: include`. The backend must allow the exact frontend origins, return `Access-Control-Allow-Credentials: true`, use secure cookies with `SameSite=None`, validate roles server-side and never trust a role sent by a browser.

The browser keeps local storage as a temporary offline fallback when the API is unavailable. Production records are stored in PostgreSQL by the backend.
