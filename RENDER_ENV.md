# Render deployment and environment configuration

The three frontends must be deployed as separate Render Static Sites. The backend must be a Render Web Service.

## Backend Web Service

Service URL: `https://alliance-air-cargo.onrender.com`

Runtime: `Docker`

Dockerfile path: `./Dockerfile`

Docker context: `.`

Health check path: `/health`

Set these in Render Dashboard → Backend service → Environment:

```env
NODE_ENV=production
PORT=10000
BACKEND_URL=https://alliance-air-cargo.onrender.com
DATABASE_URL=<use-the-rotated-postgresql-url-from-render>
DATABASE_SSL=true
DATABASE_EXTERNAL_HOST=dpg-d9g8210k1i2s73bctq6g-a.ohio-postgres.render.com
CORS_ORIGINS=https://alliance-air-cargo-1landing-page.onrender.com,https://alliance-air-cargo-1-client-page.onrender.com,https://alliance-air-cargosuperadmin.onrender.com
LANDING_URL=https://alliance-air-cargo-1landing-page.onrender.com
CLIENT_URL=https://alliance-air-cargo-1-client-page.onrender.com
SUPER_ADMIN_URL=https://alliance-air-cargosuperadmin.onrender.com
JWT_ACCESS_SECRET=<generate-a-long-random-secret>
JWT_REFRESH_SECRET=<generate-a-different-long-random-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
TRUST_PROXY=true
```

Do not create `VITE_DATABASE_URL`. Every `VITE_*` value is embedded into public browser JavaScript.

## Landing Static Site

URL: `https://alliance-air-cargo-1landing-page.onrender.com`

```env
VITE_APP_ENV=production
VITE_SITE_URL=https://alliance-air-cargo-1landing-page.onrender.com
VITE_API_BASE_URL=https://alliance-air-cargo.onrender.com
VITE_CLIENT_PORTAL_URL=https://alliance-air-cargo-1-client-page.onrender.com
```

Build command: `npm install && npm run build`

Publish directory: `dist`

## Client Portal Static Site

URL: `https://alliance-air-cargo-1-client-page.onrender.com`

```env
VITE_APP_ENV=production
VITE_SITE_URL=https://alliance-air-cargo-1-client-page.onrender.com
VITE_API_BASE_URL=https://alliance-air-cargo.onrender.com
VITE_LANDING_URL=https://alliance-air-cargo-1landing-page.onrender.com
```

Root directory: `client-portal`

Build command: `npm install && npm run build`

Publish directory: `dist`

## Super Admin Static Site

URL: `https://alliance-air-cargosuperadmin.onrender.com`

```env
VITE_APP_ENV=production
VITE_SITE_URL=https://alliance-air-cargosuperadmin.onrender.com
VITE_API_BASE_URL=https://alliance-air-cargo.onrender.com
VITE_LANDING_URL=https://alliance-air-cargo-1landing-page.onrender.com
VITE_CLIENT_URL=https://alliance-air-cargo-1-client-page.onrender.com
```

Root directory: `super-admin`

Build command: `npm install && npm run build`

Publish directory: `dist`

The landing and client portal contain no link to the Super Admin URL. Admin access remains a private, separately distributed address.
