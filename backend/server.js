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
const memoryAdminState = {}

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
  const { password, passwordHash, otp, ...safe } = cleanObject(account)
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
      CREATE TABLE IF NOT EXISTS wallet_accounts (
        owner_email TEXT PRIMARY KEY,
        owner_name TEXT NOT NULL DEFAULT '',
        business_name TEXT NOT NULL DEFAULT '',
        balance NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL REFERENCES wallet_accounts(owner_email) ON DELETE CASCADE,
        direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
        type TEXT NOT NULL,
        amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
        reference TEXT,
        note TEXT,
        balance_after NUMERIC(14, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS wallet_transactions_owner_created_idx
        ON wallet_transactions (owner_email, created_at DESC);
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

const normalizeAgentAccount = value => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase()
const demoAgentDirectory = new Map([
  ['669896496', { consigneeCompany: 'GulfLink Trading LLC', carrierAgentName: 'Alliance Air Cargo LLC', agentCity: 'Dubai', iataCode: '14-3-7821', carrierAccountNumber: '66-9896496' }],
  ['AACDEL1002', { consigneeCompany: 'Northstar Exports Pvt. Ltd.', carrierAgentName: 'Alliance Air Cargo India Pvt. Ltd.', agentCity: 'New Delhi', iataCode: '14-3-7820', carrierAccountNumber: 'AAC-DEL-1002' }],
  ['AACBOM1003', { consigneeCompany: 'Westline Logistics Pvt. Ltd.', carrierAgentName: 'Alliance Air Cargo India Pvt. Ltd.', agentCity: 'Mumbai', iataCode: '14-3-7822', carrierAccountNumber: 'AAC-BOM-1003' }],
])

const defaultChargeControls = {
  baseRatePerKg: 45,
  minimumChargeableWeight: 25,
  volumetricDivisor: 6000,
  sectorSurcharge: 0,
  flightSurcharge: 0,
  commoditySurcharge: 150,
  originStationCharge: 37.5,
  destinationStationCharge: 0,
  xrayRatePerKg: 1,
  handleWithCareCharge: 125,
  priorityHandlingCharge: 200,
  temperatureControlCharge: 350,
}

const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback
const money = value => Number(Number(value || 0).toFixed(2))
const walletSeedFor = email => email === 'agent@alliancecargo.in' ? 84200 : 0
const walletJson = row => ({
  email: row.owner_email,
  ownerName: row.owner_name,
  businessName: row.business_name,
  balance: money(row.balance),
  status: row.status,
  updatedAt: row.updated_at,
})
const transactionJson = row => ({
  id: row.id,
  email: row.owner_email,
  direction: row.direction,
  type: row.type,
  amount: money(row.amount),
  reference: row.reference,
  note: row.note,
  balanceAfter: money(row.balance_after),
  createdAt: row.created_at,
})

async function ensureWallet(db, email, profile = {}) {
  const result = await db.query(
    `INSERT INTO wallet_accounts (owner_email, owner_name, business_name, balance)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (owner_email) DO UPDATE SET
       owner_name = CASE WHEN EXCLUDED.owner_name <> '' THEN EXCLUDED.owner_name ELSE wallet_accounts.owner_name END,
       business_name = CASE WHEN EXCLUDED.business_name <> '' THEN EXCLUDED.business_name ELSE wallet_accounts.business_name END,
       updated_at = NOW()
     RETURNING *`,
    [email, String(profile.name || ''), String(profile.business || ''), walletSeedFor(email)],
  )
  return result.rows[0]
}

async function loadChargeControls(db = pool) {
  const memoryProfile = Array.isArray(memoryAdminState.charges)
    ? cleanObject(memoryAdminState.charges.find(profile => String(profile?.status || 'Active').toLowerCase() === 'active'))
    : cleanObject(memoryAdminState.chargeControls)
  let controls = { ...defaultChargeControls, ...memoryProfile }
  if (db && databaseStatus === 'connected') {
    const result = await db.query(`SELECT key, value FROM admin_state WHERE key IN ('chargeControls', 'charges')`)
    const saved = Object.fromEntries(result.rows.map(row => [row.key, row.value]))
    const chargeProfile = Array.isArray(saved.charges)
      ? cleanObject(saved.charges.find(profile => String(profile?.status || 'Active').toLowerCase() === 'active'))
      : cleanObject(saved.chargeControls)
    controls = { ...controls, ...chargeProfile }
  }
  return controls
}

async function calculateFreightDetails(data, db = pool) {
  const controls = await loadChargeControls(db)
  const pieces = Math.max(1, numberOr(data.pieces, 1))
  const actualWeight = Math.max(0, numberOr(data.actualWeight || data.weight, 0))
  const length = Math.max(0, numberOr(data.length, 0))
  const width = Math.max(0, numberOr(data.width, 0))
  const height = Math.max(0, numberOr(data.height, 0))
  const divisor = Math.max(1, numberOr(controls.volumetricDivisor, defaultChargeControls.volumetricDivisor))
  const volumetricWeight = (length * width * height * pieces) / divisor
  const chargeableWeight = Math.max(
    numberOr(controls.minimumChargeableWeight, defaultChargeControls.minimumChargeableWeight),
    Math.ceil(Math.max(actualWeight, volumetricWeight)),
  )
  const services = Array.isArray(data.extraServices) ? data.extraServices : []
  const chargeRows = [
    { key: 'baseFreight', label: 'Base freight', detail: `₹${numberOr(controls.baseRatePerKg, 45).toFixed(2)} × ${chargeableWeight.toFixed(2)} kg`, amount: numberOr(controls.baseRatePerKg, 45) * chargeableWeight },
    { key: 'sectorSurcharge', label: 'Sector surcharge', amount: numberOr(controls.sectorSurcharge, 0) },
    { key: 'flightSurcharge', label: 'Flight surcharge', amount: numberOr(controls.flightSurcharge, 0) },
    { key: 'commoditySurcharge', label: `${String(data.commodity || 'Cargo')} surcharge`, amount: numberOr(controls.commoditySurcharge, 0) },
    { key: 'originStationCharge', label: `${String(data.origin || 'Origin')} station charges`, amount: numberOr(controls.originStationCharge, 0) },
    { key: 'xrayCharges', label: 'X-ray screening charges', detail: `₹${numberOr(controls.xrayRatePerKg, 1).toFixed(2)} × ${chargeableWeight.toFixed(2)} kg`, amount: numberOr(controls.xrayRatePerKg, 1) * chargeableWeight },
    { key: 'destinationStationCharge', label: `${String(data.destination || 'Destination')} station charges`, amount: numberOr(controls.destinationStationCharge, 0) },
  ]
  if (services.includes('handleWithCare')) chargeRows.push({ key: 'handleWithCare', label: 'Handle with care', amount: numberOr(controls.handleWithCareCharge, 0) })
  if (services.includes('priorityHandling')) chargeRows.push({ key: 'priorityHandling', label: 'Priority handling', amount: numberOr(controls.priorityHandlingCharge, 0) })
  if (services.includes('temperatureControl')) chargeRows.push({ key: 'temperatureControl', label: 'Temperature control', amount: numberOr(controls.temperatureControlCharge, 0) })
  const charges = chargeRows.map(row => ({ ...row, amount: money(row.amount) }))
  return {
    weights: { totalActualWeight: money(actualWeight), totalVolumetricWeight: money(volumetricWeight), chargeableWeight: money(chargeableWeight) },
    charges,
    total: money(charges.reduce((sum, row) => sum + row.amount, 0)),
    controls,
    pricingSource: 'super-admin',
    flights: flightOptionsFor(String(data.origin || 'DEL'), String(data.destination || 'DXB'), data.bookingDate),
  }
}
const flightOptionsFor = (origin, destination, bookingDate) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(bookingDate || '')) ? bookingDate : new Date().toISOString().slice(0, 10)
  const routeCode = `${origin}${destination}`
  return [
    { id: `AAC-${routeCode}-701`, flightNumber: 'AAC 701', origin, destination, date, departure: '18:30', arrival: '22:05', cutoff: '15:00', aircraft: 'Boeing 737-800F', duration: '3h 35m', availableCapacity: 6420, stops: 'Direct', status: 'Available' },
    { id: `AAC-${routeCode}-214`, flightNumber: 'AAC 214', origin, destination, date, departure: '21:10', arrival: '01:20 +1', cutoff: '17:30', aircraft: 'Airbus A330F', duration: '4h 10m', availableCapacity: 18600, stops: 'Direct', status: 'Available' },
    { id: `AAC-${routeCode}-508`, flightNumber: 'AAC 508', origin, destination, date, departure: '23:45', arrival: '05:30 +1', cutoff: '19:30', aircraft: 'Boeing 777F', duration: '5h 45m', availableCapacity: 32100, stops: '1 stop', status: 'Limited space' },
  ]
}

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
  if (pool && user.role === 'agent') await ensureWallet(pool, email, safeUser)
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
  await ensureWallet(requireDatabase(), email, record)
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

app.post('/api/freight/calculate', authenticate, asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  response.json(await calculateFreightDetails(data))
}))

app.get('/api/agents/lookup/:accountNumber', authenticate, asyncRoute(async (request, response) => {
  const normalized = normalizeAgentAccount(request.params.accountNumber)
  if (normalized.length < 6 || normalized.length > 32) return response.status(400).json({ message: 'Enter a valid account number' })

  let agent = demoAgentDirectory.get(normalized)
  if (!agent && pool && databaseStatus === 'connected') {
    const [registrationResult, directoryResult] = await Promise.all([
      pool.query(
        `SELECT data FROM agent_registrations
       WHERE UPPER(REGEXP_REPLACE(COALESCE(data->>'accountNumber', data->>'carrierAccountNumber', ''), '[^a-zA-Z0-9]', '', 'g')) = $1
       AND LOWER(COALESCE(data->>'status', '')) IN ('approved', 'active')
       LIMIT 1`,
        [normalized],
      ),
      pool.query(`SELECT value FROM admin_state WHERE key = 'agents' LIMIT 1`),
    ])
    const managedAgents = Array.isArray(directoryResult.rows[0]?.value) ? directoryResult.rows[0].value : []
    const managedAgent = managedAgents.find(item =>
      normalizeAgentAccount(item?.accountNumber || item?.carrierAccountNumber) === normalized
      && /^(active|approved)$/i.test(String(item?.status || '')),
    )
    const data = managedAgent || registrationResult.rows[0]?.data
    if (data) {
      agent = {
        consigneeCompany: data.business || data.name || data.consigneeCompany || '',
        carrierAgentName: data.carrierAgentName || data.agentName || data.business || '',
        agentCity: data.agentCity || data.city || data.station || '',
        iataCode: data.iataCode || '',
        carrierAccountNumber: data.carrierAccountNumber || data.accountNumber || request.params.accountNumber,
      }
    }
  }

  if (!agent) return response.status(404).json({ message: 'No approved agent found for this account number' })
  response.json({ agent })
}))

app.get('/api/wallet', authenticate, requireRole('agent'), asyncRoute(async (request, response) => {
  const db = requireDatabase()
  const account = await ensureWallet(db, request.user.sub, { name: request.user.name })
  const transactions = await db.query(
    `SELECT * FROM wallet_transactions WHERE owner_email = $1 ORDER BY created_at DESC LIMIT 100`,
    [request.user.sub],
  )
  response.json({ wallet: walletJson(account), transactions: transactions.rows.map(transactionJson) })
}))

app.post('/api/wallet/top-up', authenticate, requireRole('agent'), asyncRoute(async (request, response) => {
  const amount = money(request.body?.amount)
  const method = String(request.body?.method || 'UPI').trim()
  if (amount < 100 || amount > 500000) return response.status(400).json({ message: 'Top-up amount must be between ₹100 and ₹5,00,000' })
  if (!['UPI', 'Bank transfer', 'Debit card'].includes(method)) return response.status(400).json({ message: 'Select a valid payment method' })
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    await ensureWallet(client, request.user.sub, { name: request.user.name })
    const locked = await client.query('SELECT * FROM wallet_accounts WHERE owner_email = $1 FOR UPDATE', [request.user.sub])
    if (locked.rows[0].status !== 'Active') throw Object.assign(new Error('Wallet is frozen. Contact support before adding money.'), { status: 403 })
    const balanceAfter = money(Number(locked.rows[0].balance) + amount)
    const transactionId = `WTX-${crypto.randomUUID().slice(0, 10).toUpperCase()}`
    const reference = `TOPUP-${Date.now().toString(36).toUpperCase()}`
    const updated = await client.query(
      `UPDATE wallet_accounts SET balance = $2, updated_at = NOW() WHERE owner_email = $1 RETURNING *`,
      [request.user.sub, balanceAfter],
    )
    const transaction = await client.query(
      `INSERT INTO wallet_transactions (id, owner_email, direction, type, amount, reference, note, balance_after)
       VALUES ($1, $2, 'credit', 'Wallet top-up', $3, $4, $5, $6) RETURNING *`,
      [transactionId, request.user.sub, amount, reference, `${method} top-up`, balanceAfter],
    )
    await client.query('COMMIT')
    response.status(201).json({ wallet: walletJson(updated.rows[0]), transaction: transactionJson(transaction.rows[0]) })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.post('/api/bookings', authenticate, requireRole('agent'), asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  const selectedFlight = cleanObject(data.selectedFlight)
  const pickupDate = String(data.pickup || '')
  const flightDate = String(selectedFlight.date || data.bookingDate || '')
  if (!pickupDate || !flightDate) return response.status(400).json({ message: 'Pickup date and selected flight date are required' })
  if (pickupDate > flightDate) return response.status(400).json({ message: 'Pickup date cannot be after the selected flight date' })
  const awb = String(data.awb || `AAC-${Date.now().toString().slice(-8)}`)
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    const duplicate = await client.query('SELECT awb FROM cargo_bookings WHERE awb = $1 FOR UPDATE', [awb])
    if (duplicate.rowCount) throw Object.assign(new Error('This booking has already been confirmed'), { status: 409 })
    const freightSummary = await calculateFreightDetails(data, client)
    const bookingAmount = money(freightSummary.total)
    await ensureWallet(client, request.user.sub, { name: request.user.name, business: data.shipper })
    const locked = await client.query('SELECT * FROM wallet_accounts WHERE owner_email = $1 FOR UPDATE', [request.user.sub])
    const account = locked.rows[0]
    if (account.status !== 'Active') throw Object.assign(new Error('Wallet is frozen. Contact support before booking.'), { status: 403 })
    if (Number(account.balance) < bookingAmount) {
      throw Object.assign(new Error(`Insufficient wallet balance. Add ₹${money(bookingAmount - Number(account.balance)).toLocaleString('en-IN')} to confirm this shipment.`), { status: 402 })
    }
    const balanceAfter = money(Number(account.balance) - bookingAmount)
    const transactionId = `WTX-${crypto.randomUUID().slice(0, 10).toUpperCase()}`
    const record = {
      ...data,
      id: awb,
      awb,
      ownerEmail: request.user.sub,
      agent: data.shipper || request.user.name,
      route: `${data.origin || ''} → ${data.destination || ''}`,
      status: data.status || 'Booked',
      milestone: data.milestone || 'Booking confirmed',
      progress: Number(data.progress || 15),
      payment: 'Wallet paid',
      amount: `₹${bookingAmount.toLocaleString('en-IN')}`,
      total: bookingAmount,
      freightSummary,
      walletTransactionId: transactionId,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    }
    await client.query('INSERT INTO cargo_bookings (awb, owner_email, data) VALUES ($1, $2, $3)', [awb, request.user.sub, record])
    const updated = await client.query(
      `UPDATE wallet_accounts SET balance = $2, updated_at = NOW() WHERE owner_email = $1 RETURNING *`,
      [request.user.sub, balanceAfter],
    )
    const transaction = await client.query(
      `INSERT INTO wallet_transactions (id, owner_email, direction, type, amount, reference, note, balance_after)
       VALUES ($1, $2, 'debit', 'Shipment booking', $3, $4, $5, $6) RETURNING *`,
      [transactionId, request.user.sub, bookingAmount, awb, `${data.origin || ''} → ${data.destination || ''} · ${selectedFlight.flightNumber || 'Selected flight'}`, balanceAfter],
    )
    await client.query('COMMIT')
    response.status(201).json({ booking: record, wallet: walletJson(updated.rows[0]), transaction: transactionJson(transaction.rows[0]) })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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
  if (!pool || databaseStatus !== 'connected') return response.json(memoryAdminState)
  const db = requireDatabase()
  await ensureWallet(db, 'agent@alliancecargo.in', { name: 'Demo Agent', business: 'Northstar Exports' })
  const [stateResult, agentsResult, bookingsResult, walletsResult, transactionsResult] = await Promise.all([
    db.query('SELECT key, value FROM admin_state'),
    db.query('SELECT data FROM agent_registrations ORDER BY created_at DESC'),
    db.query('SELECT data FROM cargo_bookings ORDER BY created_at DESC'),
    db.query('SELECT * FROM wallet_accounts ORDER BY updated_at DESC'),
    db.query('SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 250'),
  ])
  const state = Object.fromEntries(stateResult.rows.map(row => [row.key, row.value]))
  if (agentsResult.rowCount) state.agents = agentsResult.rows.map(row => row.data)
  if (bookingsResult.rowCount) state.bookings = bookingsResult.rows.map(row => row.data)
  state.wallets = walletsResult.rows.map(walletJson)
  state.walletTransactions = transactionsResult.rows.map(transactionJson)
  response.json(state)
}))

app.post('/api/admin/wallets/:email/adjust', authenticate, requireRole('superadmin'), asyncRoute(async (request, response) => {
  const email = String(request.params.email || '').trim().toLowerCase()
  const direction = String(request.body?.direction || '').toLowerCase()
  const amount = money(request.body?.amount)
  const note = String(request.body?.note || '').trim().slice(0, 240)
  if (!/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({ message: 'A valid wallet email is required' })
  if (!['credit', 'debit'].includes(direction)) return response.status(400).json({ message: 'Adjustment must be credit or debit' })
  if (amount <= 0 || amount > 1000000) return response.status(400).json({ message: 'Adjustment amount must be between ₹1 and ₹10,00,000' })
  if (note.length < 3) return response.status(400).json({ message: 'Enter a reason for this wallet adjustment' })
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    await ensureWallet(client, email)
    const locked = await client.query('SELECT * FROM wallet_accounts WHERE owner_email = $1 FOR UPDATE', [email])
    const currentBalance = Number(locked.rows[0].balance)
    if (direction === 'debit' && currentBalance < amount) throw Object.assign(new Error('Debit cannot exceed the available wallet balance'), { status: 400 })
    const balanceAfter = money(currentBalance + (direction === 'credit' ? amount : -amount))
    const transactionId = `WTX-${crypto.randomUUID().slice(0, 10).toUpperCase()}`
    const reference = `ADMIN-${Date.now().toString(36).toUpperCase()}`
    const updated = await client.query(
      `UPDATE wallet_accounts SET balance = $2, updated_at = NOW() WHERE owner_email = $1 RETURNING *`,
      [email, balanceAfter],
    )
    const transaction = await client.query(
      `INSERT INTO wallet_transactions (id, owner_email, direction, type, amount, reference, note, balance_after)
       VALUES ($1, $2, $3, 'Admin adjustment', $4, $5, $6, $7) RETURNING *`,
      [transactionId, email, direction, amount, reference, note, balanceAfter],
    )
    await client.query('COMMIT')
    response.json({ wallet: walletJson(updated.rows[0]), transaction: transactionJson(transaction.rows[0]) })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.patch('/api/admin/wallets/:email/status', authenticate, requireRole('superadmin'), asyncRoute(async (request, response) => {
  const email = String(request.params.email || '').trim().toLowerCase()
  const status = String(request.body?.status || '')
  if (!['Active', 'Frozen'].includes(status)) return response.status(400).json({ message: 'Wallet status must be Active or Frozen' })
  await ensureWallet(requireDatabase(), email)
  const result = await requireDatabase().query(
    `UPDATE wallet_accounts SET status = $2, updated_at = NOW() WHERE owner_email = $1 RETURNING *`,
    [email, status],
  )
  response.json({ wallet: walletJson(result.rows[0]) })
}))

app.patch('/api/admin/state', authenticate, requireRole('superadmin'), asyncRoute(async (request, response) => {
  const updates = cleanObject(request.body)
  const entries = Object.entries(updates)
  if (!entries.length || entries.length > 20) return response.status(400).json({ message: 'State update is empty or too large' })
  for (const [key] of entries) {
    if (!/^[a-z][a-zA-Z0-9]{0,49}$/.test(key)) return response.status(400).json({ message: `Invalid state key: ${key}` })
  }
  Object.assign(memoryAdminState, updates)
  if (!pool || databaseStatus !== 'connected') return response.json({ updated: entries.map(([key]) => key), persistence: 'memory' })
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    for (const [key, value] of entries) {
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
