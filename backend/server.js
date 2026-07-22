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
const connectionHost = connectionString => {
  try {
    return new URL(connectionString || '').hostname
  } catch {
    return ''
  }
}

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
      CREATE TABLE IF NOT EXISTS client_employees (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS client_employees_owner_idx ON client_employees (owner_email, created_at DESC);
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
    const currentHost = connectionHost(databaseUrl)
    const internalRenderHost = currentHost.endsWith('.render.com') ? currentHost.split('.')[0] : ''
    const fallbackHosts = [...new Set([internalRenderHost, externalDatabaseHost].filter(host => host && host !== currentHost))]
    for (const fallbackHost of fallbackHosts) {
      try {
        const fallbackUrl = new URL(databaseUrl)
        fallbackUrl.hostname = fallbackHost
        await pool.end().catch(() => {})
        pool = createPool(fallbackUrl.toString())
        await connectDatabase()
        console.log(`PostgreSQL connected through Render hostname fallback: ${fallbackHost}`)
        return
      } catch (fallbackError) {
        error = fallbackError
      }
    }
    const failedHost = connectionHost(pool?.options?.connectionString)
    if (databaseUrl && failedHost && failedHost !== currentHost) {
      await pool.end().catch(() => {})
      pool = createPool(databaseUrl)
    }
    databaseStatus = 'unavailable'
    databaseErrorCode = error.code || 'CONNECTION_FAILED'
    console.error('PostgreSQL initialization failed:', error.message)
  }
}

const demoAccounts = new Map([
  ['superadmin@alliancecargo.in', { password: 'Admin@123', otp: '246810', name: 'Aarav Sharma', business: 'Alliance Air Cargo', role: 'superadmin', status: 'Active' }],
  ['agent@alliancecargo.in', { password: 'Cargo@123', otp: '123456', name: 'Demo Agent', business: 'Northstar Exports', role: 'agent', status: 'Approved' }],
])

const employeePermissions = new Set(['viewShipments', 'createBooking', 'deleteBooking', 'trackShipments', 'viewWallet'])
const normalizeEmployeePermissions = values => {
  const permissions = [...new Set((Array.isArray(values) ? values : []).filter(permission => employeePermissions.has(permission)))]
  if (permissions.includes('createBooking') && !permissions.includes('viewWallet')) permissions.push('viewWallet')
  if (permissions.some(permission => ['createBooking', 'deleteBooking', 'trackShipments'].includes(permission)) && !permissions.includes('viewShipments')) permissions.push('viewShipments')
  return permissions
}

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

const defaultRateCards = [
  { id: 'RC-DEL-DXB-25', name: 'DEL-DXB standard 25-99 kg', origin: 'DEL', destination: 'DXB', commodity: 'All cargo', customerGroup: 'Standard', minWeight: 25, maxWeight: 99, ratePerKg: 45, minimumFreight: 1500, volumetricDivisor: 6000, fuelSurchargePercent: 0, sectorSurcharge: 0, handlingCharge: 37.5, xrayRatePerKg: 1, effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', status: 'Active' },
  { id: 'RC-DEL-DXB-100', name: 'DEL-DXB standard 100-499 kg', origin: 'DEL', destination: 'DXB', commodity: 'All cargo', customerGroup: 'Standard', minWeight: 100, maxWeight: 499, ratePerKg: 39, minimumFreight: 3900, volumetricDivisor: 6000, fuelSurchargePercent: 5, sectorSurcharge: 0, handlingCharge: 37.5, xrayRatePerKg: 1, effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', status: 'Active' },
  { id: 'RC-BOM-FRA-PHA', name: 'BOM-FRA pharma priority', origin: 'BOM', destination: 'FRA', commodity: 'Pharma supplies', customerGroup: 'Standard', minWeight: 25, maxWeight: 1000, ratePerKg: 194, minimumFreight: 2500, volumetricDivisor: 6000, fuelSurchargePercent: 12, sectorSurcharge: 250, handlingCharge: 350, xrayRatePerKg: 1.5, effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', status: 'Active' },
]

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
const normalizedAgentStatus = value => {
  const status = String(value || '').trim().toLowerCase()
  if (status === 'active' || status === 'approved') return 'Active'
  if (status === 'rejected') return 'Rejected'
  if (status === 'suspended') return 'Suspended'
  return 'Pending'
}
const agentAdminJson = account => {
  const data = cleanObject(account)
  const stationValue = String(data.station || 'Pan India')
  const station = stationValue.split(/[—–-]/)[0].trim() || 'Pan India'
  const city = data.city || stationValue.split(/[—–]/)[1]?.trim() || stationValue
  return {
    ...data,
    name: data.business || data.name || 'Registered business',
    contact: data.contact || data.applicantName || data.name || '',
    applicantName: data.applicantName || data.name || '',
    station,
    city,
    accountNumber: data.accountNumber || 'Assigned after approval',
    agentName: data.agentName || data.carrierAgentName || 'Alliance Air Cargo India Pvt. Ltd.',
    iataCode: data.iataCode || 'Assigned after approval',
    documents: data.documents || 'Review',
    status: normalizedAgentStatus(data.status),
  }
}

const agentApprovalNotification = account => {
  const agent = agentAdminJson(account)
  return {
    id: `AGENT-APPROVAL-${agent.id}`,
    type: 'agent-approval',
    agentId: agent.id,
    title: `New client approval: ${agent.name}`,
    message: `${agent.contact || agent.email || 'A new client'} submitted a registration for ${agent.station || 'Pan India'}. Review and verify the account.`,
    channel: 'Super Admin',
    audience: 'Super Admin',
    sent: agent.submittedAt || new Date().toISOString(),
    createdAt: agent.submittedAt || new Date().toISOString(),
    status: 'Unread',
    route: 'users',
  }
}

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

async function loadCommodityProfile(commodityName, db = pool) {
  let commodities = Array.isArray(memoryAdminState.commodities) ? memoryAdminState.commodities : []
  if (db && databaseStatus === 'connected') {
    const result = await db.query(`SELECT value FROM admin_state WHERE key = 'commodities' LIMIT 1`)
    if (Array.isArray(result.rows[0]?.value)) commodities = result.rows[0].value
  }
  const requested = String(commodityName || '').trim().toLowerCase()
  if (!requested) return null
  const profile = commodities.find(item => {
    const name = String(item?.name || '').trim().toLowerCase()
    const code = String(item?.id || '').trim().toLowerCase()
    return (name === requested || code === requested) && String(item?.status || 'Active').toLowerCase() === 'active'
  })
  return profile ? cleanObject(profile) : null
}

async function loadRateCards(db = pool) {
  let rateCards = Array.isArray(memoryAdminState.rateCards) ? memoryAdminState.rateCards : defaultRateCards
  if (db && databaseStatus === 'connected') {
    const result = await db.query(`SELECT value FROM admin_state WHERE key = 'rateCards' LIMIT 1`)
    if (Array.isArray(result.rows[0]?.value)) rateCards = result.rows[0].value
  }
  return rateCards.map(cleanObject)
}

async function calculateFreightDetails(data, db = pool) {
  const controls = await loadChargeControls(db)
  const commodityProfile = await loadCommodityProfile(data.commodity, db)
  const rateCards = await loadRateCards(db)
  const pieces = Math.max(1, numberOr(data.pieces, 1))
  const actualWeight = Math.max(0, numberOr(data.actualWeight || data.weight, 0))
  const length = Math.max(0, numberOr(data.length, 0))
  const width = Math.max(0, numberOr(data.width, 0))
  const height = Math.max(0, numberOr(data.height, 0))
  const origin = String(data.origin || '').trim().toUpperCase()
  const destination = String(data.destination || '').trim().toUpperCase()
  const commodity = String(data.commodity || '').trim().toLowerCase()
  const pricingDate = String(data.bookingDate || new Date().toISOString().slice(0, 10))
  const rateCard = rateCards.find(card => {
    if (String(card.status || 'Active').toLowerCase() !== 'active') return false
    if (String(card.origin || '').toUpperCase() !== origin || String(card.destination || '').toUpperCase() !== destination) return false
    const cardCommodity = String(card.commodity || 'All cargo').trim().toLowerCase()
    if (!['all', 'all cargo', 'any'].includes(cardCommodity) && cardCommodity !== commodity) return false
    if (card.effectiveFrom && pricingDate < String(card.effectiveFrom)) return false
    if (card.effectiveTo && pricingDate > String(card.effectiveTo)) return false
    const previewDivisor = Math.max(1, numberOr(card.volumetricDivisor, controls.volumetricDivisor))
    const previewVolumetric = (length * width * height * pieces) / previewDivisor
    const previewWeight = Math.max(numberOr(card.minWeight, controls.minimumChargeableWeight), Math.ceil(Math.max(actualWeight, previewVolumetric)))
    return previewWeight >= numberOr(card.minWeight, 0) && previewWeight <= numberOr(card.maxWeight, Number.MAX_SAFE_INTEGER)
  }) || null
  const pricingControls = rateCard ? {
    ...controls,
    baseRatePerKg: numberOr(rateCard.ratePerKg, controls.baseRatePerKg),
    minimumChargeableWeight: numberOr(rateCard.minWeight, controls.minimumChargeableWeight),
    volumetricDivisor: numberOr(rateCard.volumetricDivisor, controls.volumetricDivisor),
    sectorSurcharge: numberOr(rateCard.sectorSurcharge, controls.sectorSurcharge),
    xrayRatePerKg: numberOr(rateCard.xrayRatePerKg, controls.xrayRatePerKg),
  } : controls
  const divisor = Math.max(1, numberOr(pricingControls.volumetricDivisor, defaultChargeControls.volumetricDivisor))
  const volumetricWeight = (length * width * height * pieces) / divisor
  const chargeableWeight = Math.max(
    numberOr(pricingControls.minimumChargeableWeight, defaultChargeControls.minimumChargeableWeight),
    Math.ceil(Math.max(actualWeight, volumetricWeight)),
  )
  const baseRate = numberOr(pricingControls.baseRatePerKg, 45)
  const baseFreight = Math.max(baseRate * chargeableWeight, numberOr(rateCard?.minimumFreight, 0))
  const fuelSurcharge = baseFreight * numberOr(rateCard?.fuelSurchargePercent, 0) / 100
  const services = Array.isArray(data.extraServices) ? data.extraServices : []
  const chargeRows = [
    { key: 'baseFreight', label: 'Base freight', detail: `₹${baseRate.toFixed(2)} × ${chargeableWeight.toFixed(2)} kg${rateCard ? ` · ${rateCard.id}` : ''}`, amount: baseFreight },
    { key: 'fuelSurcharge', label: 'Fuel surcharge', detail: rateCard ? `${numberOr(rateCard.fuelSurchargePercent, 0).toFixed(2)}% of base freight` : 'Default rate', amount: fuelSurcharge },
    { key: 'sectorSurcharge', label: 'Sector surcharge', amount: numberOr(pricingControls.sectorSurcharge, 0) },
    { key: 'flightSurcharge', label: 'Flight surcharge', amount: numberOr(pricingControls.flightSurcharge, 0) },
    { key: 'rateCardHandling', label: 'Rate card handling charge', amount: numberOr(rateCard?.handlingCharge, 0) },
    { key: 'commoditySurcharge', label: `${String(data.commodity || 'Cargo')} surcharge`, detail: commodityProfile ? 'Commodity Management rate' : 'Default charge profile', amount: numberOr(commodityProfile?.surcharge, pricingControls.commoditySurcharge) },
    { key: 'originStationCharge', label: `${String(data.origin || 'Origin')} station charges`, amount: numberOr(pricingControls.originStationCharge, 0) },
    { key: 'xrayCharges', label: 'X-ray screening charges', detail: `₹${numberOr(pricingControls.xrayRatePerKg, 1).toFixed(2)} × ${chargeableWeight.toFixed(2)} kg`, amount: numberOr(pricingControls.xrayRatePerKg, 1) * chargeableWeight },
    { key: 'destinationStationCharge', label: `${String(data.destination || 'Destination')} station charges`, amount: numberOr(pricingControls.destinationStationCharge, 0) },
  ]
  if (services.includes('handleWithCare')) chargeRows.push({ key: 'handleWithCare', label: 'Handle with care', amount: numberOr(pricingControls.handleWithCareCharge, 0) })
  if (services.includes('priorityHandling')) chargeRows.push({ key: 'priorityHandling', label: 'Priority handling', amount: numberOr(pricingControls.priorityHandlingCharge, 0) })
  if (services.includes('temperatureControl')) chargeRows.push({ key: 'temperatureControl', label: 'Temperature control', amount: numberOr(pricingControls.temperatureControlCharge, 0) })
  const charges = chargeRows.map(row => ({ ...row, amount: money(row.amount) }))
  return {
    weights: { totalActualWeight: money(actualWeight), totalVolumetricWeight: money(volumetricWeight), chargeableWeight: money(chargeableWeight) },
    charges,
    total: money(charges.reduce((sum, row) => sum + row.amount, 0)),
    controls: pricingControls,
    rateCard,
    commodityProfile,
    pricingSource: rateCard ? 'super-admin-rate-card' : 'super-admin-default',
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
  const token = jwt.sign({ sub: user.email, role: user.role, name: user.name, business: user.business, ownerEmail: user.ownerEmail, permissions: user.permissions }, jwtSecret, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' })
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

const accountOwnerEmail = user => String(user?.role === 'employee' ? user.ownerEmail : user?.sub || '').trim().toLowerCase()

function requireEmployeePermission(permission) {
  return asyncRoute(async (request, response, next) => {
    if (request.user?.role !== 'employee') return next()
    const result = await requireDatabase().query('SELECT owner_email, data FROM client_employees WHERE LOWER(email) = $1 LIMIT 1', [String(request.user.sub || '').toLowerCase()])
    if (!result.rowCount || String(result.rows[0].data?.status || '').toLowerCase() !== 'active') return response.status(403).json({ message: 'Employee access is inactive. Contact your client account owner.' })
    const permissions = Array.isArray(result.rows[0].data?.permissions) ? result.rows[0].data.permissions : []
    if (!permissions.includes(permission)) return response.status(403).json({ message: `Your employee account does not have ${permission} permission` })
    request.user.ownerEmail = result.rows[0].owner_email
    request.user.permissions = permissions
    return next()
  })
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
    if (databaseStatus !== 'connected') throw Object.assign(new Error('Account database is temporarily unavailable. Please retry shortly.'), { status: 503 })
    if (requestedRole === 'employee') {
      const result = await pool.query('SELECT owner_email, data, password_hash FROM client_employees WHERE LOWER(email) = $1 LIMIT 1', [email])
      if (result.rowCount) {
        const saved = result.rows[0]
        valid = Boolean(password && saved.password_hash && await bcrypt.compare(password, saved.password_hash) && String(saved.data?.status || '').toLowerCase() === 'active')
        user = { ...saved.data, email, role: 'employee', ownerEmail: saved.owner_email }
      }
    } else {
      const result = await pool.query('SELECT data, password_hash FROM agent_registrations WHERE LOWER(email) = $1 LIMIT 1', [email])
      if (result.rowCount) {
        const saved = result.rows[0]
        valid = Boolean(password && saved.password_hash && await bcrypt.compare(password, saved.password_hash))
        user = { ...saved.data, email, role: 'agent' }
      }
    }
  }

  if (!valid || !user) return response.status(401).json({ message: 'Email, password or OTP is incorrect' })
  if (requestedRole && requestedRole !== user.role) return response.status(403).json({ message: 'Account role does not match this portal' })

  const safeUser = { ...publicAccount(user), email }
  if (pool && databaseStatus === 'connected' && user.role === 'agent') await ensureWallet(pool, email, safeUser)
  issueSession(response, safeUser)
  response.json({ user: safeUser })
}))

app.get('/api/auth/me', authenticate, asyncRoute(async (request, response) => {
  const email = String(request.user.sub || '').toLowerCase()
  let account = demoAccounts.get(email)
  if (request.user.role === 'employee' && pool && databaseStatus === 'connected') {
    const result = await pool.query('SELECT owner_email, data FROM client_employees WHERE LOWER(email) = $1 LIMIT 1', [email])
    if (!result.rowCount || String(result.rows[0].data?.status || '').toLowerCase() !== 'active') return response.status(403).json({ message: 'Employee access is inactive' })
    account = { ...result.rows[0].data, email, role: 'employee', ownerEmail: result.rows[0].owner_email }
  } else if (request.user.role === 'agent' && pool && databaseStatus === 'connected') {
    const result = await pool.query('SELECT data FROM agent_registrations WHERE LOWER(email) = $1 LIMIT 1', [email])
    if (result.rowCount) account = { ...result.rows[0].data, email, role: 'agent', status: normalizedAgentStatus(result.rows[0].data.status) }
  }
  const user = { ...publicAccount(account || request.user), email, role: request.user.role }
  response.json({ user })
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
  const employeeConflict = await requireDatabase().query('SELECT 1 FROM client_employees WHERE LOWER(email) = $1 LIMIT 1', [email])
  if (employeeConflict.rowCount) return response.status(409).json({ message: 'This email is already assigned to an employee login' })
  const id = `AGT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const passwordHash = await bcrypt.hash(password, 12)
  const record = { ...publicAccount(data), id, email, role: 'agent', status: 'Pending', submittedAt: new Date().toISOString() }
  await requireDatabase().query(
    `INSERT INTO agent_registrations (id, email, password_hash, data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, password_hash = EXCLUDED.password_hash, data = EXCLUDED.data, updated_at = NOW()`,
    [id, email, passwordHash, record],
  )
  await ensureWallet(requireDatabase(), email, record)
  issueSession(response, record)
  response.status(201).json({ account: record, message: 'Registration submitted for Super Admin approval' })
}))

app.get('/api/client/employees', authenticate, requireRole('agent'), asyncRoute(async (request, response) => {
  const result = await requireDatabase().query('SELECT data FROM client_employees WHERE owner_email = $1 ORDER BY created_at DESC', [String(request.user.sub).toLowerCase()])
  response.json({ employees: result.rows.map(row => publicAccount(row.data)) })
}))

app.post('/api/client/employees', authenticate, requireRole('agent'), asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  const ownerEmail = String(request.user.sub || '').toLowerCase()
  const email = String(data.email || '').trim().toLowerCase()
  const password = String(data.password || '')
  const name = String(data.name || '').trim()
  const permissions = normalizeEmployeePermissions(data.permissions)
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({ message: 'Employee name and valid email are required' })
  if (email === ownerEmail) return response.status(400).json({ message: 'Employee email must be different from the client owner email' })
  if (password.length < 8) return response.status(400).json({ message: 'Create an employee password of at least 8 characters' })
  if (!permissions.length) return response.status(400).json({ message: 'Select at least one employee permission' })
  const ownerRegistration = await requireDatabase().query('SELECT data FROM agent_registrations WHERE LOWER(email) = $1 LIMIT 1', [ownerEmail])
  if (ownerRegistration.rowCount && normalizedAgentStatus(ownerRegistration.rows[0].data?.status) !== 'Active') return response.status(403).json({ message: 'Super Admin approval is required before creating employee access' })
  const agentConflict = await requireDatabase().query('SELECT 1 FROM agent_registrations WHERE LOWER(email) = $1 LIMIT 1', [email])
  const employeeConflict = await requireDatabase().query('SELECT 1 FROM client_employees WHERE LOWER(email) = $1 LIMIT 1', [email])
  if (agentConflict.rowCount || employeeConflict.rowCount || demoAccounts.has(email)) return response.status(409).json({ message: 'This email already belongs to another portal account' })
  const id = `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const passwordHash = await bcrypt.hash(password, 12)
  const record = { id, name, email, phone: String(data.phone || '').trim(), designation: String(data.designation || 'Booking executive').trim(), permissions, status: 'Active', role: 'employee', business: request.user.business || 'Client account', ownerEmail, createdAt: new Date().toISOString() }
  await requireDatabase().query('INSERT INTO client_employees (id, owner_email, email, password_hash, data) VALUES ($1, $2, $3, $4, $5)', [id, ownerEmail, email, passwordHash, record])
  response.status(201).json({ employee: record, message: 'Employee credentials created' })
}))

app.patch('/api/client/employees/:id', authenticate, requireRole('agent'), asyncRoute(async (request, response) => {
  const id = String(request.params.id || '').trim()
  const ownerEmail = String(request.user.sub || '').toLowerCase()
  const data = cleanObject(request.body)
  const existing = await requireDatabase().query('SELECT data FROM client_employees WHERE id = $1 AND owner_email = $2 LIMIT 1', [id, ownerEmail])
  if (!existing.rowCount) return response.status(404).json({ message: 'Employee account not found' })
  const permissions = data.permissions === undefined ? existing.rows[0].data.permissions : normalizeEmployeePermissions(data.permissions)
  if (!permissions.length) return response.status(400).json({ message: 'Select at least one employee permission' })
  const status = data.status === undefined ? existing.rows[0].data.status : String(data.status)
  if (!['Active', 'Inactive'].includes(status)) return response.status(400).json({ message: 'Employee status must be Active or Inactive' })
  const nextData = { ...existing.rows[0].data, name: String(data.name ?? existing.rows[0].data.name).trim(), phone: String(data.phone ?? existing.rows[0].data.phone ?? '').trim(), designation: String(data.designation ?? existing.rows[0].data.designation ?? '').trim(), permissions, status, updatedAt: new Date().toISOString() }
  const password = String(data.password || '')
  if (password && password.length < 8) return response.status(400).json({ message: 'New employee password must be at least 8 characters' })
  const result = password
    ? await requireDatabase().query('UPDATE client_employees SET password_hash = $3, data = $4, updated_at = NOW() WHERE id = $1 AND owner_email = $2 RETURNING data', [id, ownerEmail, await bcrypt.hash(password, 12), nextData])
    : await requireDatabase().query('UPDATE client_employees SET data = $3, updated_at = NOW() WHERE id = $1 AND owner_email = $2 RETURNING data', [id, ownerEmail, nextData])
  response.json({ employee: publicAccount(result.rows[0].data) })
}))

app.delete('/api/client/employees/:id', authenticate, requireRole('agent'), asyncRoute(async (request, response) => {
  const result = await requireDatabase().query('DELETE FROM client_employees WHERE id = $1 AND owner_email = $2 RETURNING id', [String(request.params.id || ''), String(request.user.sub || '').toLowerCase()])
  if (!result.rowCount) return response.status(404).json({ message: 'Employee account not found' })
  response.json({ deleted: result.rows[0].id })
}))

app.post('/api/quotes', asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  if (!Object.keys(data).length) return response.status(400).json({ message: 'Quote request details are required' })
  const id = `Q-${Date.now().toString(36).toUpperCase()}`
  const record = { ...data, id, status: 'New', createdAt: new Date().toISOString() }
  await requireDatabase().query('INSERT INTO quote_requests (id, data) VALUES ($1, $2)', [id, record])
  response.status(201).json({ quote: record, message: 'Quote request received' })
}))

app.post('/api/rates/quote', asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  const chargeableWeight = Math.max(1, Math.ceil(Number(data.chargeableWeight || data.weight || 1)))
  const origin = String(data.origin || '').toUpperCase()
  const destination = String(data.destination || '').toUpperCase()
  const commodity = String(data.commodity || '').toLowerCase()
  const today = new Date().toISOString().slice(0, 10)
  const rateCard = (await loadRateCards()).find(card => {
    const cardCommodity = String(card.commodity || 'All cargo').toLowerCase()
    return String(card.status || 'Active').toLowerCase() === 'active'
      && String(card.origin || '').toUpperCase() === origin
      && String(card.destination || '').toUpperCase() === destination
      && (['all', 'all cargo', 'any'].includes(cardCommodity) || !commodity || cardCommodity === commodity)
      && chargeableWeight >= numberOr(card.minWeight, 0)
      && chargeableWeight <= numberOr(card.maxWeight, Number.MAX_SAFE_INTEGER)
      && (!card.effectiveFrom || today >= String(card.effectiveFrom))
      && (!card.effectiveTo || today <= String(card.effectiveTo))
  }) || null
  const fallbackRate = destination === 'DXB' ? 168 : destination === 'SIN' ? 142 : 195
  const ratePerKg = numberOr(rateCard?.ratePerKg, fallbackRate)
  const baseFreight = Math.max(chargeableWeight * ratePerKg, numberOr(rateCard?.minimumFreight, 0))
  const cardTotal = baseFreight
    + (baseFreight * numberOr(rateCard?.fuelSurchargePercent, 0) / 100)
    + numberOr(rateCard?.sectorSurcharge, 0)
    + numberOr(rateCard?.handlingCharge, 0)
    + (chargeableWeight * numberOr(rateCard?.xrayRatePerKg, 0))
  response.json({
    chargeableWeight,
    rateCard,
    pricingSource: rateCard ? 'super-admin-rate-card' : 'fallback-rate',
    options: [
      { carrier: 'Alliance Priority', flight: 'Direct · Daily', time: '1–2 days', rate: money(cardTotal * 1.08), best: true },
      { carrier: 'Alliance Standard', flight: '1 stop · Mon–Sat', time: '2–3 days', rate: money(cardTotal) },
      { carrier: 'Alliance Economy', flight: 'Consolidated', time: '3–5 days', rate: money(cardTotal * 0.94) },
    ],
  })
}))

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

app.get('/api/wallet', authenticate, requireRole('agent', 'employee'), requireEmployeePermission('viewWallet'), asyncRoute(async (request, response) => {
  const db = requireDatabase()
  const ownerEmail = accountOwnerEmail(request.user)
  const account = await ensureWallet(db, ownerEmail, { name: request.user.name, business: request.user.business })
  const transactions = await db.query(
    `SELECT * FROM wallet_transactions WHERE owner_email = $1 ORDER BY created_at DESC LIMIT 100`,
    [ownerEmail],
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

app.post('/api/bookings', authenticate, requireRole('agent', 'employee'), requireEmployeePermission('createBooking'), asyncRoute(async (request, response) => {
  const data = cleanObject(request.body)
  const ownerEmail = accountOwnerEmail(request.user)
  const selectedFlight = cleanObject(data.selectedFlight)
  const pickupDate = String(data.pickup || '')
  const flightDate = String(selectedFlight.date || data.bookingDate || '')
  if (!pickupDate || !flightDate) return response.status(400).json({ message: 'Pickup date and selected flight date are required' })
  if (pickupDate > flightDate) return response.status(400).json({ message: 'Pickup date cannot be after the selected flight date' })
  const awb = String(data.awb || `AAC-${Date.now().toString().slice(-8)}`)
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    const registration = await client.query('SELECT data FROM agent_registrations WHERE LOWER(email) = $1 LIMIT 1 FOR SHARE', [ownerEmail])
    if (registration.rowCount && normalizedAgentStatus(registration.rows[0].data?.status) !== 'Active') {
      throw Object.assign(new Error('Business verification is pending. Super Admin approval is required before booking.'), { status: 403 })
    }
    const duplicate = await client.query('SELECT awb FROM cargo_bookings WHERE awb = $1 FOR UPDATE', [awb])
    if (duplicate.rowCount) throw Object.assign(new Error('This booking has already been confirmed'), { status: 409 })
    const freightSummary = await calculateFreightDetails(data, client)
    const bookingAmount = money(freightSummary.total)
    await ensureWallet(client, ownerEmail, { name: request.user.name, business: data.shipper || request.user.business })
    const locked = await client.query('SELECT * FROM wallet_accounts WHERE owner_email = $1 FOR UPDATE', [ownerEmail])
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
      ownerEmail,
      bookedBy: request.user.sub,
      bookedByName: request.user.name,
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
    await client.query('INSERT INTO cargo_bookings (awb, owner_email, data) VALUES ($1, $2, $3)', [awb, ownerEmail, record])
    const updated = await client.query(
      `UPDATE wallet_accounts SET balance = $2, updated_at = NOW() WHERE owner_email = $1 RETURNING *`,
      [ownerEmail, balanceAfter],
    )
    const transaction = await client.query(
      `INSERT INTO wallet_transactions (id, owner_email, direction, type, amount, reference, note, balance_after)
       VALUES ($1, $2, 'debit', 'Shipment booking', $3, $4, $5, $6) RETURNING *`,
      [transactionId, ownerEmail, bookingAmount, awb, `${data.origin || ''} → ${data.destination || ''} · ${selectedFlight.flightNumber || 'Selected flight'} · Booked by ${request.user.sub}`, balanceAfter],
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

app.get('/api/shipments', authenticate, requireRole('agent', 'employee', 'superadmin'), requireEmployeePermission('viewShipments'), asyncRoute(async (request, response) => {
  const admin = request.user.role === 'superadmin'
  const ownerEmail = accountOwnerEmail(request.user)
  const result = await requireDatabase().query(
    `SELECT data FROM cargo_bookings WHERE ($1::boolean OR owner_email = $2) ORDER BY created_at DESC`,
    [admin, ownerEmail],
  )
  response.json({ shipments: result.rows.map(row => row.data) })
}))

app.delete('/api/bookings/:awb', authenticate, requireRole('agent', 'employee'), requireEmployeePermission('deleteBooking'), asyncRoute(async (request, response) => {
  const ownerEmail = accountOwnerEmail(request.user)
  const awb = String(request.params.awb || '').trim()
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT data FROM cargo_bookings WHERE awb = $1 AND owner_email = $2 FOR UPDATE', [awb, ownerEmail])
    if (!existing.rowCount) throw Object.assign(new Error('Shipment was not found in this client account'), { status: 404 })
    if (!['Booked', 'Cancelled'].includes(String(existing.rows[0].data?.status || ''))) throw Object.assign(new Error('Only booked or cancelled shipments can be deleted'), { status: 409 })
    const refundAmount = money(existing.rows[0].data?.total)
    let wallet = null
    let transaction = null
    if (refundAmount > 0 && existing.rows[0].data?.payment === 'Wallet paid') {
      await ensureWallet(client, ownerEmail)
      const lockedWallet = await client.query('SELECT * FROM wallet_accounts WHERE owner_email = $1 FOR UPDATE', [ownerEmail])
      const balanceAfter = money(Number(lockedWallet.rows[0].balance) + refundAmount)
      const updatedWallet = await client.query('UPDATE wallet_accounts SET balance = $2, updated_at = NOW() WHERE owner_email = $1 RETURNING *', [ownerEmail, balanceAfter])
      const transactionId = `WTX-${crypto.randomUUID().slice(0, 10).toUpperCase()}`
      const inserted = await client.query(`INSERT INTO wallet_transactions (id, owner_email, direction, type, amount, reference, note, balance_after) VALUES ($1, $2, 'credit', 'Shipment cancellation refund', $3, $4, $5, $6) RETURNING *`, [transactionId, ownerEmail, refundAmount, awb, `Deleted by ${request.user.sub}`, balanceAfter])
      wallet = walletJson(updatedWallet.rows[0])
      transaction = transactionJson(inserted.rows[0])
    }
    await client.query('DELETE FROM cargo_bookings WHERE awb = $1 AND owner_email = $2', [awb, ownerEmail])
    await client.query('COMMIT')
    response.json({ deleted: awb, wallet, transaction })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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
  const managedAgents = Array.isArray(state.agents) ? state.agents : []
  const registeredAgents = agentsResult.rows.map(row => agentAdminJson(row.data))
  const registeredKeys = new Set(registeredAgents.flatMap(item => [item.id, String(item.email || '').toLowerCase()]).filter(Boolean))
  state.agents = [...registeredAgents, ...managedAgents.filter(item => !registeredKeys.has(item.id) && !registeredKeys.has(String(item.email || '').toLowerCase()))]
  const savedNotifications = Array.isArray(state.notifications) ? state.notifications : []
  const approvalNotifications = registeredAgents
    .filter(item => item.status === 'Pending')
    .map(agentApprovalNotification)
  state.notifications = [
    ...approvalNotifications,
    ...savedNotifications.filter(item => item.type !== 'agent-approval'),
  ]
  state.pendingAgentApprovals = approvalNotifications.length
  if (bookingsResult.rowCount) state.bookings = bookingsResult.rows.map(row => row.data)
  state.wallets = walletsResult.rows.map(walletJson)
  state.walletTransactions = transactionsResult.rows.map(transactionJson)
  response.json(state)
}))

app.patch('/api/admin/agents/approve-all', authenticate, requireRole('superadmin'), asyncRoute(async (request, response) => {
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    const pending = await client.query(
      `SELECT id AS row_id, email, data
       FROM agent_registrations
       WHERE LOWER(COALESCE(data->>'status', 'pending')) = 'pending'
       ORDER BY created_at
       FOR UPDATE`,
    )
    const approved = []
    for (const row of pending.rows) {
      const current = cleanObject(row.data)
      const stationValue = String(current.station || 'DEL')
      const stationCode = stationValue.split(/[â€”â€“-]/)[0].trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'DEL'
      const suffix = String(row.row_id).replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase().padStart(4, '0')
      const nextData = {
        ...current,
        accountNumber: current.accountNumber && current.accountNumber !== 'Assigned after approval' ? current.accountNumber : `AAC-${stationCode}-${suffix}`,
        agentName: current.agentName || 'Alliance Air Cargo India Pvt. Ltd.',
        carrierAgentName: current.carrierAgentName || current.agentName || 'Alliance Air Cargo India Pvt. Ltd.',
        iataCode: current.iataCode && current.iataCode !== 'Assigned after approval' ? current.iataCode : `14-3-${suffix}`,
        documents: 'Verified',
        status: 'Active',
        approvedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: request.user.sub,
      }
      const updated = await client.query('UPDATE agent_registrations SET data = $2, updated_at = NOW() WHERE id = $1 RETURNING email, data', [row.row_id, nextData])
      await ensureWallet(client, updated.rows[0].email, nextData)
      approved.push(agentAdminJson(updated.rows[0].data))
    }
    await client.query('COMMIT')
    response.json({ agents: approved, count: approved.length, message: `${approved.length} pending client account${approved.length === 1 ? '' : 's'} approved` })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.patch('/api/admin/agents/:id/status', authenticate, requireRole('superadmin'), asyncRoute(async (request, response) => {
  const id = String(request.params.id || '').trim()
  const requestedStatus = String(request.body?.status || '').trim()
  if (!id) return response.status(400).json({ message: 'Agent registration ID is required' })
  if (!['Active', 'Rejected', 'Suspended', 'Pending'].includes(requestedStatus)) return response.status(400).json({ message: 'Select a valid agent approval status' })
  const client = await requireDatabase().connect()
  try {
    await client.query('BEGIN')
    const locked = await client.query(`SELECT id AS row_id, email, data FROM agent_registrations WHERE id = $1 OR data->>'id' = $1 ORDER BY updated_at DESC LIMIT 1 FOR UPDATE`, [id])
    if (!locked.rowCount) throw Object.assign(new Error('Registered agent was not found'), { status: 404 })
    const current = cleanObject(locked.rows[0].data)
    const stationValue = String(current.station || 'DEL')
    const stationCode = stationValue.split(/[—–-]/)[0].trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'DEL'
    const suffix = String(id).replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase().padStart(4, '0')
    const approvedFields = requestedStatus === 'Active' ? {
      accountNumber: current.accountNumber && current.accountNumber !== 'Assigned after approval' ? current.accountNumber : `AAC-${stationCode}-${suffix}`,
      agentName: current.agentName || 'Alliance Air Cargo India Pvt. Ltd.',
      carrierAgentName: current.carrierAgentName || current.agentName || 'Alliance Air Cargo India Pvt. Ltd.',
      iataCode: current.iataCode && current.iataCode !== 'Assigned after approval' ? current.iataCode : `14-3-${suffix}`,
      documents: 'Verified',
      approvedAt: new Date().toISOString(),
    } : {}
    const nextData = { ...current, ...approvedFields, status: requestedStatus, reviewedAt: new Date().toISOString(), reviewedBy: request.user.sub }
    const updated = await client.query('UPDATE agent_registrations SET data = $2, updated_at = NOW() WHERE id = $1 RETURNING email, data', [locked.rows[0].row_id, nextData])
    await ensureWallet(client, updated.rows[0].email, nextData)
    await client.query('COMMIT')
    response.json({ agent: agentAdminJson(updated.rows[0].data), message: `Agent marked ${requestedStatus}` })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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
    const transactionType = direction === 'credit' ? 'Wallet recharge' : 'Admin debit adjustment'
    const reference = `${direction === 'credit' ? 'RECHARGE' : 'ADMIN-DEBIT'}-${Date.now().toString(36).toUpperCase()}`
    const updated = await client.query(
      `UPDATE wallet_accounts SET balance = $2, updated_at = NOW() WHERE owner_email = $1 RETURNING *`,
      [email, balanceAfter],
    )
    const transaction = await client.query(
      `INSERT INTO wallet_transactions (id, owner_email, direction, type, amount, reference, note, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [transactionId, email, direction, transactionType, amount, reference, note, balanceAfter],
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
