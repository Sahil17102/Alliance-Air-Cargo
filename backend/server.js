import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import pg from 'pg'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT || 10000)
const production = process.env.NODE_ENV === 'production'
const jwtSecret = process.env.JWT_ACCESS_SECRET || crypto.randomBytes(48).toString('hex')
const databaseUrl = process.env.DATABASE_URL?.trim().replace(/^['"]|['"]$/g, '')
const externalDatabaseHost = process.env.DATABASE_EXTERNAL_HOST || 'dpg-d9g8210k1i2s73bctq6g-a.ohio-postgres.render.com'
const defaultOrigins = [
  'https://alliance-air-cargo-1landing-page.onrender.com',
  'https://alliance-air-cargo-1-client-page.onrender.com',
  'https://alliance-air-cargosuperadmin.onrender.com',
]
const configuredOrigins = (process.env.CORS_ORIGINS || '').split(',')
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins].map(value => value.trim().replace(/\/$/, '')).filter(Boolean))]

const createPool = connectionString => new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 7000,
  idleTimeoutMillis: 30000,
  max: 10,
})

let pool = databaseUrl ? createPool(databaseUrl) : null

let databaseStatus = pool ? 'connecting' : 'not-configured'
let databaseErrorCode = null

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true)
    return callback(Object.assign(new Error('Origin is not allowed by CORS'), { status: 403 }))
  },
}

app.set('trust proxy', process.env.TRUST_PROXY === 'false' ? false : 1)
app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(compression())
app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

const asyncRoute = handler => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next)
const requireDatabase = () => {
  if (!pool) throw Object.assign(new Error('DATABASE_URL is not configured'), { status: 503 })
  return pool
}
const cleanObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const publicAccount = account => {
  const { password, passwordHash, ...safe } = cleanObject(account)
  return safe
}

const schemaSql = `
      CREATE TABLE IF NOT EXISTS quote_requests (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS agent_registrations (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS cargo_bookings (
        awb TEXT PRIMARY KEY,
        owner_email TEXT,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS admin_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `

async function connectDatabase() {
  await pool.query(schemaSql)
  databaseStatus = 'connected'
  databaseErrorCode = null
  console.log('PostgreSQL schema is ready')
}

async function initializeDatabase() {
  if (!pool) return
  try {
    await connectDatabase()
  } catch (error) {
    const currentHost = (() => { try { return new URL(databaseUrl).hostname } catch { return '' } })()
    const canUseExternalFallback = error.code === 'ENOTFOUND' && currentHost && currentHost !== externalDatabaseHost && externalDatabaseHost
    if (canUseExternalFallback) {
      try {
        const fallbackUrl = new URL(databaseUrl)
        fallbackUrl.hostname = externalDatabaseHost
        await pool.end().catch(() => {})
        pool = createPool(fallbackUrl.toString())
        await connectDatabase()
        console.log('PostgreSQL connected through the Render external hostname fallback')
        return
      } catch (fallbackError) {
        error = fallbackError
      }
    }
    databaseStatus = 'unavailable'
    databaseErrorCode = error.code || 'CONNECTION_FAILED'
    console.error('PostgreSQL initialization failed:', error.message)
  }
}

const demoAccounts = new Map([
  ['superadmin@alliancecargo.in', { password: 'Admin@123', otp: '246810', name: 'Aarav Sharma', business: 'Alliance Air Cargo', role: 'superadmin', status: 'Active' }],
  ['agent@alliancecargo.in', { password: 'Cargo@123', otp: '123456', name: 'Demo Agent', business: 'Northstar Exports', role: 'agent', status: 'Approved' }],
  ['ops@alliancecargo.in', { password: 'Ops@123', otp: '123456', name: 'Operations User', business: 'Alliance Air Cargo', role: 'employee', status: 'Active' }],
])

function issueSession(response, user) {
  const token = jwt.sign({ sub: user.email, role: user.role, name: user.name }, jwtSecret, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' })
  response.cookie('aac_session', token, {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  })
}

function authenticate(request, response, next) {
  const bearer = request.get('authorization')?.replace(/^Bearer\s+/i, '')
  const token = request.cookies.aac_session || bearer
  if (!token) return response.status(401).json({ message: 'Authentication required' })
  try {
    request.user = jwt.verify(token, jwtSecret)
    return next()
  } catch {
    return response.status(401).json({ message: 'Session expired or invalid' })
  }
}

function requireRole(...roles) {
  return (request, response, next) => roles.includes(request.user?.role)
    ? next()
    : response.status(403).json({ message: 'You do not have permission for this action' })
}

app.get('/', (_request, response) => response.json({
  service: 'Alliance Air Cargo API',
  status: 'running',
  database: databaseStatus,
  version: '1.0.0',
}))

app.get(['/health', '/api/health'], asyncRoute(async (_request, response) => {
  if (pool) {
    try {
      await pool.query('SELECT 1')
      databaseStatus = 'connected'
      databaseErrorCode = null
    } catch (error) {
      databaseStatus = 'unavailable'
      databaseErrorCode = error.code || 'CONNECTION_FAILED'
    }
  }
  response.json({ status: 'ok', database: databaseStatus, databaseErrorCode, timestamp: new Date().toISOString() })
}))

app.post('/api/auth/login', asyncRoute(async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase()
  const password = String(request.body?.password || '')
  const otp = String(request.body?.otp || '')
  const requestedRole = String(request.body?.role || '').toLowerCase()
  if (!email || (!password && !otp)) return response.status(400).json({ message: 'Email and password or OTP are required' })

  let user = demoAccounts.get(email)
  let valid = user && ((password && password === user.password) || (otp && otp === user.otp))

  if (!valid && pool) {
    const result = await pool.query('SELECT data, password_hash FROM agent_registrations WHERE LOWER(email) = $1 LIMIT 1', [email])
    if (result.rowCount) {
      const saved = result.rows[0]
      valid = Boolean(password && saved.password_hash && await bcrypt.compare(password, saved.password_hash))
      user = { ...saved.data, email, role: 'agent' }
    }
  }

  if (!valid || !user) return response.status(401).json({ message: 'Email, password or OTP is incorrect' })
  if (requestedRole && requestedRole !== user.role) return response.status(403).json({ message: 'Account role does not match this portal' })

  const safeUser = { ...publicAccount(user), email }
  issueSession(response, safeUser)
  response.json({ user: safeUser })
}))

app.post('/api/auth/logout', (_request, response) => {
  response.clearCookie('aac_session', { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', path: '/' })
  response.json({ message: 'Signed out' })
})

app.post('/api/auth/register', asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  const email = String(data.email || '').trim().toLowerCase()
  const password = String(data.password || '')
  if (!email || password.length < 8) return response.status(400).json({ message: 'A valid email and password of at least 8 characters are required' })
  const id = `AGT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const passwordHash = await bcrypt.hash(password, 12)
  const record = { ...publicAccount(data), id, email, role: 'agent', status: data.status || 'Pending' }
  await requireDatabase().query(
    `INSERT INTO agent_registrations (id, email, password_hash, data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, data = EXCLUDED.data, updated_at = NOW()`,
    [id, email, passwordHash, record],
  )
  response.status(201).json({ account: record })
}))

app.post('/api/quotes', asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  if (!Object.keys(data).length) return response.status(400).json({ message: 'Quote request details are required' })
  const id = `Q-${Date.now().toString(36).toUpperCase()}`
  const record = { ...data, id, status: 'New', createdAt: new Date().toISOString() }
  await requireDatabase().query('INSERT INTO quote_requests (id, data) VALUES ($1, $2)', [id, record])
  response.status(201).json({ quote: record, message: 'Quote request received' })
}))

app.post('/api/rates/quote', (request, response) => {
  const data = cleanObject(request.body)
  const chargeableWeight = Math.max(1, Math.ceil(Number(data.chargeableWeight || data.weight || 1)))
  const base = data.destination === 'DXB' ? 168 : data.destination === 'SIN' ? 142 : 195
  response.json({
    chargeableWeight,
    options: [
      { carrier: 'Alliance Priority', flight: 'Direct · Daily', time: '1–2 days', rate: chargeableWeight * base, best: true },
      { carrier: 'Alliance Standard', flight: '1 stop · Mon–Sat', time: '2–3 days', rate: chargeableWeight * Math.max(1, base - 24) },
      { carrier: 'Alliance Economy', flight: 'Consolidated', time: '3–5 days', rate: chargeableWeight * Math.max(1, base - 41) },
    ],
  })
})

app.post('/api/bookings', authenticate, asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  const awb = String(data.awb || `AAC-${Date.now().toString().slice(-8)}`)
  const record = { ...data, awb, status: data.status || 'Booked', milestone: data.milestone || 'Booking confirmed', progress: Number(data.progress || 15) }
  await requireDatabase().query(
    `INSERT INTO cargo_bookings (awb, owner_email, data) VALUES ($1, $2, $3)
     ON CONFLICT (awb) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [awb, request.user.sub, record],
  )
  response.status(201).json({ booking: record })
}))

app.get('/api/shipments', authenticate, asyncRoute(async (request, response) => {
  const admin = request.user.role === 'superadmin'
  const result = await requireDatabase().query(
    `SELECT data FROM cargo_bookings WHERE ($1::boolean OR owner_email = $2) ORDER BY created_at DESC`,
    [admin, request.user.sub],
  )
  response.json({ shipments: result.rows.map(row => row.data) })
}))

app.get('/api/admin/bootstrap', authenticate, requireRole('superadmin'), asyncRoute(async (_request, response) => {
  const db = requireDatabase()
  const [stateResult, agentsResult, bookingsResult] = await Promise.all([
    db.query('SELECT key, value FROM admin_state'),
    db.query('SELECT data FROM agent_registrations ORDER BY created_at DESC'),
    db.query('SELECT data FROM cargo_bookings ORDER BY created_at DESC'),
  ])
  const state = Object.fromEntries(stateResult.rows.map(row => [row.key, row.value]))
  if (agentsResult.rowCount) state.agents = agentsResult.rows.map(row => row.data)
  if (bookingsResult.rowCount) state.bookings = bookingsResult.rows.map(row => row.data)
  response.json(state)
}))

app.patch('/api/admin/state', authenticate, requireRole('superadmin'), asyncRoute(async (request, response) => {
  const updates = cleanObject(request.body)
  const entries = Object.entries(updates)
  if (!entries.length || entries.length > 20) return response.status(400).json({ message: 'State update is empty or too large' })
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    for (const [key, value] of entries) {
      if (!/^[a-z][a-zA-Z0-9]{0,49}$/.test(key)) throw Object.assign(new Error(`Invalid state key: ${key}`), { status: 400 })
      await client.query(
        `INSERT INTO admin_state (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  response.json({ updated: entries.map(([key]) => key) })
}))

app.use((_request, response) => response.status(404).json({ message: 'API route not found' }))

app.use((error, _request, response, _next) => {
  const status = Number(error.status || (error.code === '23505' ? 409 : 500))
  if (status >= 500) console.error(error)
  response.status(status).json({ message: status === 500 ? 'An unexpected server error occurred' : error.message })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Alliance Air Cargo API listening on port ${port}`)
  initializeDatabase()
})

const shutdown = async signal => {
  console.log(`${signal} received; shutting down`)
  await pool?.end()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
