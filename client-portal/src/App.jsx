import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Bell, Box, Building2, Calculator, CalendarDays, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, Clock3, Copy,
  FileCheck2, FileText, Gauge, Headphones, LayoutDashboard, LoaderCircle, LockKeyhole,
  LogOut, Mail, MapPin, Menu, PackageCheck, PanelLeftClose, Phone, Plane,
  Plus, RefreshCcw, Search, Send, Settings, ShieldCheck, Truck, Upload, User, UserPlus,
  WalletCards, Warehouse, X, Zap,
} from 'lucide-react'
import { api } from './lib/api'

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'http://127.0.0.1:5173'
const DEMO_AGENT = { email: 'agent@alliancecargo.in', password: 'Cargo@123', name: 'Demo Agent', business: 'Northstar Exports', role: 'agent', status: 'Approved' }
const DEMO_EMPLOYEE = { email: 'ops@alliancecargo.in', password: 'Ops@123', name: 'Operations User', business: 'Alliance Air Cargo', role: 'employee', status: 'Active' }
const stations = ['DEL — New Delhi','BOM — Mumbai','BLR — Bengaluru','MAA — Chennai','CCU — Kolkata','HYD — Hyderabad','AMD — Ahmedabad','PNQ — Pune','COK — Kochi','DXB — Dubai']
const defaultShipments = [
  { awb:'125-98765432', origin:'DEL', destination:'DXB', commodity:'Automotive parts', weight:186, status:'In transit', milestone:'Departed Delhi hub', eta:'24 Jul, 14:30', progress:64 },
  { awb:'098-45671234', origin:'BOM', destination:'FRA', commodity:'Pharma supplies', weight:84, status:'Booked', milestone:'Awaiting pickup', eta:'26 Jul, 09:15', progress:20 },
  { awb:'176-22098451', origin:'BLR', destination:'SIN', commodity:'Electronics', weight:245, status:'Delivered', milestone:'Delivered to consignee', eta:'Delivered 19 Jul', progress:100 },
  { awb:'157-33190276', origin:'DEL', destination:'LHR', commodity:'Garments', weight:420, status:'At hub', milestone:'Customs cleared', eta:'25 Jul, 18:40', progress:46 },
]

const normalizeAgentAccount = value => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase()
const demoAgentDirectory = {
  '669896496': {
    consigneeCompany: 'GulfLink Trading LLC',
    carrierAgentName: 'Alliance Air Cargo LLC',
    agentCity: 'Dubai',
    iataCode: '14-3-7821',
    carrierAccountNumber: '66-9896496',
  },
  AACDEL1002: {
    consigneeCompany: 'Northstar Exports Pvt. Ltd.',
    carrierAgentName: 'Alliance Air Cargo India Pvt. Ltd.',
    agentCity: 'New Delhi',
    iataCode: '14-3-7820',
    carrierAccountNumber: 'AAC-DEL-1002',
  },
  AACBOM1003: {
    consigneeCompany: 'Westline Logistics Pvt. Ltd.',
    carrierAgentName: 'Alliance Air Cargo India Pvt. Ltd.',
    agentCity: 'Mumbai',
    iataCode: '14-3-7822',
    carrierAccountNumber: 'AAC-BOM-1003',
  },
}

const defaultFreightControls = {baseRatePerKg:45,minimumChargeableWeight:25,volumetricDivisor:6000,sectorSurcharge:0,flightSurcharge:0,commoditySurcharge:150,originStationCharge:37.5,destinationStationCharge:0,xrayRatePerKg:1,handleWithCareCharge:125,priorityHandlingCharge:200,temperatureControlCharge:350}
const inr = value => `₹${Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const localFlightOptions = (origin,destination,date) => [
  {id:`AAC-${origin}${destination}-701`,flightNumber:'AAC 701',origin,destination,date,departure:'18:30',arrival:'22:05',cutoff:'15:00',aircraft:'Boeing 737-800F',duration:'3h 35m',availableCapacity:6420,stops:'Direct',status:'Available'},
  {id:`AAC-${origin}${destination}-214`,flightNumber:'AAC 214',origin,destination,date,departure:'21:10',arrival:'01:20 +1',cutoff:'17:30',aircraft:'Airbus A330F',duration:'4h 10m',availableCapacity:18600,stops:'Direct',status:'Available'},
  {id:`AAC-${origin}${destination}-508`,flightNumber:'AAC 508',origin,destination,date,departure:'23:45',arrival:'05:30 +1',cutoff:'19:30',aircraft:'Boeing 777F',duration:'5h 45m',availableCapacity:32100,stops:'1 stop',status:'Limited space'},
]
const calculateLocalFreight = (form,extraServices,controls=defaultFreightControls) => {
  const actual=Math.max(0,Number(form.actualWeight||0)), pieces=Math.max(1,Number(form.pieces||1))
  const volumetric=Math.max(0,(Number(form.length||0)*Number(form.width||0)*Number(form.height||0)*pieces)/Math.max(1,Number(controls.volumetricDivisor||6000)))
  const chargeable=Math.max(Number(controls.minimumChargeableWeight||25),Math.ceil(Math.max(actual,volumetric)))
  const rows=[
    {key:'baseFreight',label:'Base freight',detail:`₹${Number(controls.baseRatePerKg).toFixed(2)} × ${chargeable.toFixed(2)} kg`,amount:Number(controls.baseRatePerKg)*chargeable},
    {key:'sectorSurcharge',label:'Sector surcharge',amount:Number(controls.sectorSurcharge)},
    {key:'flightSurcharge',label:'Flight surcharge',amount:Number(controls.flightSurcharge)},
    {key:'commoditySurcharge',label:`${form.commodity} surcharge`,amount:Number(controls.commoditySurcharge)},
    {key:'originStationCharge',label:`${form.origin} station charges`,amount:Number(controls.originStationCharge)},
    {key:'xrayCharges',label:'X-ray screening charges',detail:`₹${Number(controls.xrayRatePerKg).toFixed(2)} × ${chargeable.toFixed(2)} kg`,amount:Number(controls.xrayRatePerKg)*chargeable},
    {key:'destinationStationCharge',label:`${form.destination} station charges`,amount:Number(controls.destinationStationCharge)},
  ]
  if(extraServices.includes('handleWithCare'))rows.push({key:'handleWithCare',label:'Handle with care',amount:Number(controls.handleWithCareCharge)})
  if(extraServices.includes('priorityHandling'))rows.push({key:'priorityHandling',label:'Priority handling',amount:Number(controls.priorityHandlingCharge)})
  if(extraServices.includes('temperatureControl'))rows.push({key:'temperatureControl',label:'Temperature control',amount:Number(controls.temperatureControlCharge)})
  const charges=rows.map(row=>({...row,amount:Number(row.amount.toFixed(2))}))
  return {weights:{totalActualWeight:Number(actual.toFixed(2)),totalVolumetricWeight:Number(volumetric.toFixed(2)),chargeableWeight:Number(chargeable.toFixed(2))},charges,total:Number(charges.reduce((sum,row)=>sum+row.amount,0).toFixed(2)),controls,pricingSource:'local-fallback',flights:localFlightOptions(form.origin,form.destination,form.bookingDate)}
}

const routeMap = {
  dashboard: { title:'Dashboard', icon:LayoutDashboard }, rates:{ title:'Rate calculator', icon:Calculator }, booking:{ title:'Book shipment', icon:Plus },
  shipments:{ title:'My shipments', icon:Box }, track:{ title:'Track AWB', icon:Search }, wallet:{ title:'Wallet', icon:WalletCards }, documents:{ title:'Documents', icon:FileText }, profile:{ title:'Company profile', icon:Building2 },
}

const defaultWallet = {
  wallet:{email:'agent@alliancecargo.in',ownerName:'Demo Agent',businessName:'Northstar Exports',balance:84200,status:'Active'},
  transactions:[
    {id:'WTX-DEMO-01',direction:'credit',type:'Wallet top-up',amount:100000,reference:'TOPUP-DEMO',note:'Bank transfer top-up',balanceAfter:100000,createdAt:'2026-07-20T10:15:00.000Z'},
    {id:'WTX-DEMO-02',direction:'debit',type:'Shipment booking',amount:15800,reference:'AAC-98765432',note:'DEL → DXB · AAC 701',balanceAfter:84200,createdAt:'2026-07-21T12:30:00.000Z'},
  ],
}

function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return (hash.split('?')[0] || 'login').replace(/\/$/, '')
}
function go(route) { window.location.hash = `/${route}` }

function Logo({ compact = false, light = false }) {
  return <a href={LANDING_URL} className="flex items-center gap-3" aria-label="Alliance Air Cargo home">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-lg shadow-blue-900/10"><svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true"><path d="M8 30.5 24.7 12l15.6 3.6-14.8 6.6-5.4 12.9-3.8-8.9-8.3 4.3Z" fill="currentColor"/><path d="m18.8 24.9 7.1-2.9" stroke="#F4B400" strokeWidth="2.4" strokeLinecap="round"/></svg></span>
    {!compact && <span className="leading-none"><strong className={`font-display block text-[16px] tracking-[-.02em] ${light?'text-white':'text-navy'}`}>ALLIANCE</strong><span className={`mt-1 block text-[9px] font-bold tracking-[.2em] ${light?'text-blue-200':'text-brand'}`}>AIR CARGO</span></span>}
  </a>
}

function AirCargoVisual() {
  return <div className="air-cargo-visual" aria-hidden="true">
    <div className="air-cargo-glow" />
    <div className="air-route-orbit"><span className="air-route-plane"><Plane size={20} strokeWidth={2.2}/></span></div>
    <div className="cargo-cube">
      <div className="cargo-face cargo-front"><span className="cargo-mark"><Plane size={14} fill="currentColor"/> AAC</span><span className="cargo-code">AIR CARGO</span></div>
      <div className="cargo-face cargo-back" />
      <div className="cargo-face cargo-right" />
      <div className="cargo-face cargo-left" />
      <div className="cargo-face cargo-top" />
      <div className="cargo-face cargo-bottom" />
    </div>
    <div className="cargo-floor-shadow" />
    <div className="air-route-label"><span>DEL</span><span className="air-route-line"><i/><Plane size={12}/><i/></span><span>DXB</span></div>
  </div>
}

function Toast({ message, onClose }) {
  if (!message) return null
  return <div role="status" className="fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-xl border border-green-200 bg-white p-4 text-sm text-slate-700 shadow-2xl"><CheckCircle2 className="shrink-0 text-green-600" size={20}/><span className="leading-5">{message}</span><button onClick={onClose} aria-label="Close notification"><X size={16}/></button></div>
}

function AuthLayout({ children, title, text }) {
  return <main className="min-h-screen bg-white lg:grid lg:grid-cols-[.88fr_1.12fr]">
    <section className="auth-pattern relative hidden min-h-screen overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col">
      <div className="absolute -right-40 -top-32 h-[520px] w-[520px] rounded-full border border-white/10"/><div className="absolute -right-24 -top-16 h-[380px] w-[380px] rounded-full border border-white/10"/>
      <AirCargoVisual/>
      <div className="relative z-10"><Logo light/></div><div className="relative z-10 my-auto max-w-lg"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-blue-100"><ShieldCheck size={15} className="text-gold"/> Secure client workspace</span><h1 className="font-display mt-7 text-4xl font-semibold leading-tight tracking-[-.04em] xl:text-5xl">Cargo operations,<br/>all in one place.</h1><p className="mt-5 max-w-md text-[15px] leading-7 text-blue-100/75">Compare rates, place bookings, manage documents and track every milestone with one clear, professional workspace.</p><div className="mt-10 grid grid-cols-3 gap-3">{[['Fast','Rate compare'],['Unified','Tracking'],['Secure','Documents']].map(([a,b])=><div key={a} className="rounded-xl border border-white/10 bg-white/[.07] p-4 backdrop-blur-sm"><strong className="font-display text-lg">{a}</strong><span className="mt-1 block text-[10px] uppercase tracking-wider text-blue-200/70">{b}</span></div>)}</div></div>
      <p className="relative z-10 text-xs text-blue-200/55">© {new Date().getFullYear()} Alliance Air Cargo</p>
    </section>
    <section className="flex min-h-screen flex-col bg-white">
      <header className="flex h-20 items-center justify-between border-b border-slate-100 px-5 sm:px-9 lg:hidden"><Logo/><a href={LANDING_URL} className="text-xs font-bold text-brand">Back to website</a></header>
      <div className="mx-auto flex w-full max-w-[620px] flex-1 flex-col justify-center px-5 py-10 sm:px-10">
        <a href={LANDING_URL} className="mb-8 hidden items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand lg:inline-flex"><ArrowLeft size={15}/> Back to main website</a>
        <h2 className="font-display text-3xl font-semibold tracking-[-.035em] text-navy">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>{children}
      </div>
    </section>
  </main>
}

function Login({ onLogin, onForgot, onRegister, toast }) {
  const [accountType,setAccountType]=useState('agent')
  const [method,setMethod]=useState('password')
  const [email,setEmail]=useState(accountType==='agent'?DEMO_AGENT.email:DEMO_EMPLOYEE.email)
  const [password,setPassword]=useState(accountType==='agent'?DEMO_AGENT.password:DEMO_EMPLOYEE.password)
  const [otpSent,setOtpSent]=useState(false)
  const [otp,setOtp]=useState('')
  const [error,setError]=useState(''),[loading,setLoading]=useState(false)
  useEffect(()=>{ setEmail(accountType==='agent'?DEMO_AGENT.email:DEMO_EMPLOYEE.email); setPassword(accountType==='agent'?DEMO_AGENT.password:DEMO_EMPLOYEE.password); setError(''); setMethod('password') },[accountType])
  const submit=async e=>{e.preventDefault();setError('');const registered=JSON.parse(localStorage.getItem('aac_registered')||'null');const target=accountType==='employee'?DEMO_EMPLOYEE:(registered?.email===email?registered:DEMO_AGENT);if(method==='otp'){if(!otpSent)return setError('Request an OTP first.');if(otp!=='123456')return setError('Enter the demo OTP 123456.')}else if(email.toLowerCase()!==target.email.toLowerCase()||password!==target.password)return setError('Email or password is incorrect. Use the demo credentials shown below.');setLoading(true);try{const result=await api.post('/api/auth/login',method==='otp'?{email,otp,role:accountType}:{email,password,role:accountType});onLogin({...target,...result?.user,email})}catch(error){setError(error.message||'Unable to sign in right now.')}finally{setLoading(false)}}
  return <AuthLayout title="Welcome back" text="Sign in to manage your cargo account and active shipments.">
    <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button onClick={()=>setAccountType('agent')} className={`rounded-lg py-2.5 text-xs font-bold ${accountType==='agent'?'bg-white text-brand shadow-sm':'text-slate-500'}`}>Client / Agent</button><button onClick={()=>setAccountType('employee')} className={`rounded-lg py-2.5 text-xs font-bold ${accountType==='employee'?'bg-white text-brand shadow-sm':'text-slate-500'}`}>Employee</button></div>
    {accountType==='agent'&&<div className="mt-4 flex gap-5 border-b border-slate-200"><button onClick={()=>setMethod('password')} className={`border-b-2 pb-3 text-xs font-bold ${method==='password'?'border-brand text-brand':'border-transparent text-slate-400'}`}>Password login</button><button onClick={()=>setMethod('otp')} className={`border-b-2 pb-3 text-xs font-bold ${method==='otp'?'border-brand text-brand':'border-transparent text-slate-400'}`}>Email OTP</button></div>}
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="field-label">Registered email<input className="field mt-2" type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
      {method==='password'?<label className="field-label">Password<div className="relative mt-2"><input className="field pr-10" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/><LockKeyhole size={17} className="absolute right-3 top-3.5 text-slate-400"/></div></label>:<><button type="button" onClick={()=>{setOtpSent(true);toast('Demo OTP sent. Use 123456 to continue.')}} className="btn-secondary w-full"><Mail size={17}/>{otpSent?'Resend login OTP':'Send login OTP'}</button>{otpSent&&<label className="field-label">Enter 6-digit OTP<input className="field mt-2 tracking-[.3em]" inputMode="numeric" maxLength="6" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} placeholder="123456"/></label>}</>}
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">{error}</p>}
      {method==='password'&&<div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-slate-500"><input type="checkbox" className="accent-brand"/> Remember me</label><button type="button" onClick={onForgot} className="font-bold text-brand">Forgot password?</button></div>}
      <button className="btn-primary w-full" disabled={loading}>{loading?<LoaderCircle className="animate-spin" size={16}/>:<>Sign in securely <ArrowRight size={16}/></>}</button>
    </form>
    <div className="mt-5 rounded-xl border border-blue-100 bg-sky p-4 text-xs leading-5 text-slate-600"><strong className="text-navy">Demo {accountType} access</strong><br/>{accountType==='agent'?'agent@alliancecargo.in / Cargo@123':'ops@alliancecargo.in / Ops@123'}</div>
    {accountType==='agent'&&<p className="mt-6 text-center text-sm text-slate-500">New business? <button onClick={onRegister} className="font-bold text-brand">Register as an agent</button></p>}
  </AuthLayout>
}

function ForgotPassword({ onBack, toast }) {
  const [sent,setSent]=useState(false)
  return <AuthLayout title="Reset your password" text="We’ll send password reset instructions to your registered email address.">
    {!sent?<form onSubmit={e=>{e.preventDefault();setSent(true);toast('Reset link generated for this static demo.')}} className="mt-7 space-y-5"><label className="field-label">Registered email<input type="email" required className="field mt-2" placeholder="you@company.com"/></label><button className="btn-primary w-full"><Send size={16}/> Send reset link</button></form>:<div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-6"><CheckCircle2 className="text-green-600"/><h3 className="font-display mt-4 font-semibold text-navy">Check your inbox</h3><p className="mt-2 text-sm leading-6 text-slate-600">A reset link confirmation has been created. Email delivery will activate when the backend is connected.</p></div>}
    <button onClick={onBack} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand"><ArrowLeft size={16}/> Back to login</button>
  </AuthLayout>
}

function Register({ onComplete, onBack, toast }) {
  const [step,setStep]=useState(1), [verified,setVerified]=useState(false), [otpSent,setOtpSent]=useState(false), [otp,setOtp]=useState(''), [panIndia,setPanIndia]=useState(false)
  const [data,setData]=useState({name:'',business:'',type:'Private Limited',phone:'',email:'',password:'',gst:'',registration:'',station:'DEL — New Delhi'})
  const update=e=>setData({...data,[e.target.name]:e.target.value})
  const verify=()=>{if(otp==='123456'){setVerified(true);toast('Email verified successfully.')}else toast('Use demo OTP 123456.')}
  const next=e=>{e.preventDefault();if(step===1&&!verified)return toast('Please verify your email before continuing.');setStep(Math.min(3,step+1))}
  const submit=e=>{e.preventDefault();const account={...data,role:'agent',status:'Pending approval',panIndia};localStorage.setItem('aac_registered',JSON.stringify(account));api.post('/api/auth/register',account).catch(()=>{});onComplete(account)}
  return <AuthLayout title="Create your cargo account" text="Register your business, verify your email and submit documents for approval.">
    <div className="mt-7 flex items-center gap-2">{[1,2,3].map((n,i)=><div key={n} className="flex flex-1 items-center gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${step>=n?'bg-brand text-white':'bg-slate-100 text-slate-400'}`}>{step>n?<Check size={14}/>:n}</span>{i<2&&<span className={`h-0.5 flex-1 ${step>n?'bg-brand':'bg-slate-200'}`}/>}</div>)}</div>
    <form onSubmit={step===3?submit:next} className="mt-7">
      {step===1&&<div className="fade grid gap-4 sm:grid-cols-2"><label className="field-label">Full name *<input name="name" required className="field mt-2" value={data.name} onChange={update}/></label><label className="field-label">Business name *<input name="business" required className="field mt-2" value={data.business} onChange={update}/></label><label className="field-label">Organisation type<select name="type" className="field mt-2" value={data.type} onChange={update}>{['Proprietorship','Partnership','LLP','Private Limited','Public Limited','Individual','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field-label">Phone number *<input name="phone" required className="field mt-2" value={data.phone} onChange={update}/></label><label className="field-label sm:col-span-2">Email address *<input name="email" type="email" required className="field mt-2" value={data.email} onChange={update}/></label><label className="field-label sm:col-span-2">Create password *<input name="password" type="password" minLength="8" required className="field mt-2" value={data.password} onChange={update} placeholder="Minimum 8 characters"/></label><div className="sm:col-span-2 flex gap-2"><button type="button" onClick={()=>{if(!data.email)return toast('Enter your email first.');setOtpSent(true);toast('Demo verification OTP: 123456')}} className="btn-secondary flex-1"><Mail size={16}/>{otpSent?'Resend OTP':'Send email OTP'}</button>{otpSent&&<><input aria-label="Email OTP" className="field max-w-[145px] tracking-[.2em]" placeholder="123456" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/><button type="button" onClick={verify} className="btn-secondary">{verified?<Check size={16}/>: 'Verify'}</button></>}</div>{verified&&<p className="sm:col-span-2 flex items-center gap-2 text-xs font-bold text-green-600"><CheckCircle2 size={16}/> Email verified</p>}</div>}
      {step===2&&<div className="fade space-y-5"><label className="field-label">GST number *<input name="gst" required className="field mt-2 uppercase" value={data.gst} onChange={update} placeholder="22AAAAA0000A1Z5"/></label><label className="field-label">GST certificate *<span className="mt-2 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-blue-200 bg-sky p-4 text-sm font-medium text-slate-500"><span className="flex items-center gap-2"><Upload size={17} className="text-brand"/> Choose PDF or image</span><input type="file" required accept=".pdf,image/*" className="sr-only"/></span></label><label className="field-label">Business registration number<input name="registration" className="field mt-2" value={data.registration} onChange={update}/></label><label className="field-label">Supporting document<span className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-200 p-4 text-sm font-medium text-slate-500"><Upload size={17}/> Upload document<input type="file" accept=".pdf,image/*" className="sr-only"/></span></label></div>}
      {step===3&&<div className="fade space-y-5"><label className="field-label">Applying station<select name="station" className="field mt-2" value={data.station} onChange={update}>{stations.map(x=><option key={x}>{x}</option>)}</select></label><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={panIndia} onChange={e=>setPanIndia(e.target.checked)} className="mt-1 accent-brand"/><span><strong className="block text-sm text-navy">Apply for Pan India access</strong><small className="mt-1 block leading-5 text-slate-500">Request access to create bookings across all supported stations.</small></span></label><div className="rounded-xl bg-sky p-4 text-xs leading-5 text-slate-600"><strong className="text-navy">Approval workflow</strong><br/>Your application will show as pending until Super Admin review is connected in the third application.</div></div>}
      <div className="mt-7 flex gap-3">{step>1&&<button type="button" onClick={()=>setStep(step-1)} className="btn-secondary"><ArrowLeft size={16}/> Back</button>}<button className="btn-primary flex-1">{step===3?'Submit registration':'Continue'} <ArrowRight size={16}/></button></div>
    </form>
    {step===1&&<button onClick={onBack} className="mt-6 w-full text-center text-sm font-bold text-brand">Already registered? Sign in</button>}
  </AuthLayout>
}

function Sidebar({ route, mobile, setMobile, onLogout, user }) {
  return <><div onClick={()=>setMobile(false)} className={`fixed inset-0 z-40 bg-navy/45 backdrop-blur-sm lg:hidden ${mobile?'block':'hidden'}`}/><aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-navy text-white transition-transform lg:translate-x-0 ${mobile?'translate-x-0':'-translate-x-full'}`}>
    <div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><Logo light/><button className="lg:hidden" onClick={()=>setMobile(false)}><X size={20}/></button></div>
    <div className="px-4 py-5"><p className="px-3 text-[9px] font-bold uppercase tracking-[.18em] text-blue-300/60">Workspace</p><nav className="mt-3 space-y-1">{Object.entries(routeMap).map(([key,{title,icon:Icon}])=><a key={key} href={`#/${key}`} onClick={()=>setMobile(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${route===key?'bg-brand text-white shadow-lg shadow-blue-950/20':'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}><Icon size={18}/>{title}</a>)}</nav></div>
    <div className="mt-auto border-t border-white/10 p-4"><div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[.07] p-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-gold text-xs font-bold text-navy">{user.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span><span className="min-w-0"><strong className="block truncate text-xs">{user.name}</strong><small className="mt-1 block truncate text-[10px] text-blue-200/60">{user.business}</small></span></div><button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-blue-100/65 hover:bg-white/10 hover:text-white"><LogOut size={16}/> Sign out</button></div>
  </aside></>
}

function PortalHeader({ route, setMobile, user, wallet }) {
  return <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7 lg:ml-[270px]"><div className="flex items-center gap-3"><button onClick={()=>setMobile(true)} aria-label="Open sidebar" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 lg:hidden"><Menu size={20}/></button><div><p className="font-display text-base font-semibold text-navy sm:text-lg">{routeMap[route]?.title||'Client portal'}</p><p className="hidden text-[10px] uppercase tracking-wider text-slate-400 sm:block">Alliance Air Cargo workspace</p></div></div><div className="flex items-center gap-2"><button onClick={()=>go('wallet')} className="hidden items-center gap-2 rounded-lg border border-blue-100 bg-sky px-3 py-2 text-left sm:flex"><WalletCards size={15} className="text-brand"/><span><small className="block text-[8px] uppercase tracking-wider text-slate-400">Wallet</small><strong className="block text-[10px] text-navy">{inr(wallet?.balance||0)}</strong></span></button><span className={`hidden rounded-full px-3 py-1.5 text-[10px] font-bold md:block ${user.status==='Approved'||user.status==='Active'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{user.status}</span><button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500"><Bell size={18}/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold ring-2 ring-white"/></button></div></header>
}

function PageTitle({ eyebrow, title, text, action }) { return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-brand">{eyebrow}</p><h1 className="font-display mt-2 text-2xl font-semibold tracking-[-.03em] text-navy sm:text-3xl">{title}</h1>{text&&<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{text}</p>}</div>{action}</div> }

function StatusBadge({ status }) { const cls=status==='Delivered'?'bg-green-50 text-green-700':status==='In transit'?'bg-blue-50 text-brand':status==='Booked'?'bg-amber-50 text-amber-700':'bg-purple-50 text-purple-700'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{status}</span> }
function Badge({ value }) { const active=value==='Active'; return <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{value||'Loading'}</span> }

function Dashboard({ user, shipments, wallet }) {
  const [trackAwb,setTrackAwb]=useState('')
  const activeShipments=shipments.filter(x=>x.status!=='Delivered')
  const active=activeShipments.length
  const inTransit=shipments.filter(x=>x.status==='In transit').length
  const delivered=shipments.filter(x=>x.status==='Delivered').length
  const cargoWeight=shipments.reduce((total,item)=>total+Number(item.weight||0),0)
  const focusShipment=activeShipments[0]||shipments[0]
  const progress=Number(focusShipment?.progress||0)
  const milestones=[['Booked',15],['Origin hub',38],['In flight',65],['Destination',86],['Delivered',100]]
  const departures=[
    {flight:'AAC 701',route:'DEL → DXB',date:'Today',time:'18:30',cutoff:'15:00',space:'6,420 kg',status:'On time'},
    {flight:'AAC 214',route:'BOM → FRA',date:'Today',time:'21:10',cutoff:'17:30',space:'18,600 kg',status:'Boarding'},
    {flight:'AAC 508',route:'BLR → SIN',date:'Tomorrow',time:'01:45',cutoff:'21:00',space:'32,100 kg',status:'Scheduled'},
  ]
  const activity=[
    {icon:Plane,title:'Flight departed Delhi hub',meta:'AWB 125-98765432 · 42 min ago',color:'bg-blue-50 text-brand'},
    {icon:FileCheck2,title:'Shipping documents verified',meta:'AWB 157-33190276 · 2 hours ago',color:'bg-green-50 text-green-600'},
    {icon:Box,title:'New booking confirmed',meta:'AWB 098-45671234 · Yesterday',color:'bg-amber-50 text-amber-600'},
  ]
  const submitTrack=e=>{e.preventDefault();if(trackAwb.trim())go(`track?awb=${encodeURIComponent(trackAwb.trim())}`)}

  return <div className="fade">
    <PageTitle eyebrow="Customer control centre" title={`Good morning, ${user.name.split(' ')[0]}.`} text="Track operations, manage bookings and stay ahead of every cargo movement from one workspace." action={<div className="flex flex-wrap gap-2"><button onClick={()=>go('rates')} className="btn-secondary"><Calculator size={16}/> Check rates</button><button onClick={()=>go('booking')} className="btn-primary"><Plus size={16}/> New booking</button></div>}/>

    {user.status==='Pending approval'&&<div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><Clock3 className="shrink-0" size={19}/><div><strong>Business verification pending</strong><p className="mt-1 text-xs leading-5">Your registration is saved. Booking access will activate after Super Admin approval.</p></div></div>}

    <section className="relative overflow-hidden rounded-2xl bg-navy p-5 text-white shadow-xl shadow-blue-950/10 sm:p-7">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10"/><div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border border-white/10"/>
      <div className="relative grid gap-7 xl:grid-cols-[1fr_.72fr] xl:items-center">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-blue-100"><span className="h-2 w-2 rounded-full bg-green-400"/> Account operational</span><h2 className="font-display mt-5 max-w-2xl text-2xl font-semibold leading-tight tracking-[-.035em] sm:text-3xl">Your cargo network is moving smoothly.</h2><p className="mt-3 max-w-xl text-xs leading-6 text-blue-100/70 sm:text-sm">{active} active shipments across {new Set(activeShipments.flatMap(item=>[item.origin,item.destination])).size||0} stations. Current service performance is within SLA.</p><div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-xs"><span className="flex items-center gap-2 text-blue-100"><ShieldCheck size={16} className="text-gold"/> Account ID AAC-1042</span><span className="flex items-center gap-2 text-blue-100"><MapPin size={16} className="text-gold"/> Home station DEL</span><span className="flex items-center gap-2 text-blue-100"><Headphones size={16} className="text-gold"/> Priority support</span></div></div>
        <form onSubmit={submitTrack} className="rounded-xl border border-white/10 bg-white/[.08] p-4 backdrop-blur-sm sm:p-5"><label className="text-[10px] font-bold uppercase tracking-[.15em] text-blue-200">Quick AWB tracking</label><div className="mt-3 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={trackAwb} onChange={e=>setTrackAwb(e.target.value)} className="field search-field border-0 bg-white text-navy" placeholder="125-98765432" aria-label="Air waybill number"/></div><button className="btn-primary shrink-0 bg-gold text-navy hover:bg-amber-400">Track cargo <ArrowRight size={15}/></button></div><button type="button" onClick={()=>setTrackAwb('125-98765432')} className="mt-3 text-left text-[10px] font-semibold text-blue-200 hover:text-white">Try sample AWB: 125-98765432</button></form>
      </div>
    </section>

    <section aria-label="Account metrics" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {[[Box,'Active shipments',active,'2 require attention','bg-blue-50 text-brand'],[Plane,'In transit',inTransit,'Moving now','bg-cyan-50 text-cyan-600'],[PackageCheck,'Delivered',delivered,'This period','bg-green-50 text-green-600'],[Gauge,'Total cargo',`${cargoWeight.toLocaleString('en-IN')} kg`,'Booked weight','bg-purple-50 text-purple-600'],[WalletCards,'Wallet balance',inr(wallet?.balance||0),wallet?.status||'Loading account','bg-amber-50 text-amber-600'],[Clock3,'On-time rate','98.4%','Last 30 days','bg-rose-50 text-rose-600']].map(([Icon,label,value,meta,color])=><article key={label} className="card p-4 sm:p-5"><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={19}/></span><span className="text-[9px] font-bold text-green-600">LIVE</span></div><strong className="font-display mt-4 block text-xl text-navy">{value}</strong><span className="mt-1 block text-[11px] font-semibold text-slate-600">{label}</span><small className="mt-2 block text-[9px] text-slate-400">{meta}</small></article>)}
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.28fr_.72fr]">
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-brand">Live movement</p><h2 className="font-display mt-1 text-lg font-semibold text-navy">Priority shipment</h2></div>{focusShipment&&<StatusBadge status={focusShipment.status}/>}</div>
        {focusShipment?<div className="p-5 sm:p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><button onClick={()=>go(`track?awb=${encodeURIComponent(focusShipment.awb)}`)} className="font-display text-xl font-semibold text-brand hover:text-blue-800">{focusShipment.awb}</button><p className="mt-2 text-xs text-slate-500">{focusShipment.commodity} · {focusShipment.weight} kg</p></div><div className="flex items-center gap-3 rounded-xl bg-sky px-4 py-3"><strong className="font-display text-lg text-navy">{focusShipment.origin}</strong><span className="flex items-center text-brand"><span className="h-px w-6 bg-blue-300"/><Plane className="mx-2" size={18}/><span className="h-px w-6 bg-blue-300"/></span><strong className="font-display text-lg text-navy">{focusShipment.destination}</strong></div></div><div className="mt-7"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand transition-all" style={{width:`${progress}%`}}/></div><div className="mt-4 grid grid-cols-5 gap-1">{milestones.map(([label,point])=><div key={label} className={`${progress>=point?'text-navy':'text-slate-300'}`}><span className={`mb-2 block h-2 w-2 rounded-full ${progress>=point?'bg-brand':'bg-slate-200'}`}/><span className="hidden text-[9px] font-semibold sm:block">{label}</span></div>)}</div></div><div className="mt-6 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">{[['Latest update',focusShipment.milestone],['Estimated arrival',focusShipment.eta],['Journey complete',`${progress}%`]].map(([label,value])=><div key={label}><span className="text-[9px] uppercase tracking-wider text-slate-400">{label}</span><strong className="mt-1 block text-xs text-navy">{value}</strong></div>)}</div><button onClick={()=>go(`track?awb=${encodeURIComponent(focusShipment.awb)}`)} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-brand">Open full tracking <ArrowRight size={15}/></button></div>:<div className="p-10 text-center text-sm text-slate-400">No shipment is available yet.</div>}
      </section>

      <section className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-brand">Shortcuts</p><h2 className="font-display mt-1 text-lg font-semibold text-navy">Quick actions</h2></div><Zap size={20} className="text-gold"/></div><div className="mt-5 grid grid-cols-2 gap-3">{[[Plus,'Book cargo','booking','bg-blue-50 text-brand'],[Calculator,'Get a rate','rates','bg-amber-50 text-amber-600'],[Search,'Track AWB','track','bg-green-50 text-green-600'],[Upload,'Documents','documents','bg-purple-50 text-purple-600'],[Box,'Shipments','shipments','bg-cyan-50 text-cyan-600'],[WalletCards,'Add money','wallet','bg-slate-100 text-slate-600']].map(([Icon,label,route,color])=><button key={label} onClick={()=>go(route)} className="group rounded-xl border border-slate-100 p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><span className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}><Icon size={17}/></span><strong className="mt-3 block text-[11px] text-navy group-hover:text-brand">{label}</strong></button>)}</div><div className="mt-5 rounded-xl bg-sky p-4"><div className="flex items-start gap-3"><Headphones size={19} className="shrink-0 text-brand"/><div><strong className="text-xs text-navy">Dedicated cargo desk</strong><p className="mt-1 text-[10px] leading-4 text-slate-500">Operational support available 24×7.</p><div className="mt-3 flex flex-wrap gap-3"><a href="tel:+919810080808" className="text-[10px] font-bold text-brand">Call support</a><a href="mailto:cargo@allianceaircargo.in" className="text-[10px] font-bold text-brand">Send email</a></div></div></div></div></section>
    </div>

    <section className="card mt-6 overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6"><div><h2 className="font-display text-lg font-semibold text-navy">Recent shipments</h2><p className="mt-1 text-xs text-slate-400">Latest bookings and operational status</p></div><button onClick={()=>go('shipments')} className="inline-flex items-center gap-1 text-xs font-bold text-brand">View all <ChevronRight size={15}/></button></div><ShipmentTable shipments={shipments.slice(0,5)} compact/></section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6"><div><h2 className="font-display text-lg font-semibold text-navy">Upcoming departures</h2><p className="mt-1 text-xs text-slate-400">Flights available for your regular routes</p></div><Plane size={20} className="text-brand"/></div><div className="divide-y divide-slate-100">{departures.map(item=><article key={item.flight} className="grid gap-3 p-5 transition hover:bg-slate-50 sm:grid-cols-[.7fr_1fr_.8fr_.8fr_auto] sm:items-center"><div><strong className="text-xs text-navy">{item.flight}</strong><span className="mt-1 block text-[9px] text-slate-400">{item.date} · {item.time}</span></div><strong className="text-xs text-brand">{item.route}</strong><div><span className="text-[9px] text-slate-400">Cargo cutoff</span><strong className="mt-1 block text-[10px] text-navy">{item.cutoff}</strong></div><div><span className="text-[9px] text-slate-400">Available</span><strong className="mt-1 block text-[10px] text-navy">{item.space}</strong></div><StatusBadge status={item.status}/></article>)}</div><div className="border-t border-slate-100 p-4 text-center"><button onClick={()=>go('rates')} className="text-xs font-bold text-brand">Check availability & rates <ArrowRight className="inline" size={14}/></button></div></section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <section className="card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-brand">Prepaid account</p><h2 className="font-display mt-1 text-base font-semibold text-navy">Shipment wallet</h2></div><WalletCards size={20} className="text-brand"/></div><div className="mt-5 rounded-xl bg-navy p-4 text-white"><div className="flex items-end justify-between"><div><span className="text-[9px] text-blue-200">Available balance</span><strong className="font-display mt-1 block text-xl">{inr(wallet?.balance||0)}</strong></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${wallet?.status==='Active'?'bg-green-400/15 text-green-300':'bg-red-400/15 text-red-200'}`}>{wallet?.status||'Loading'}</span></div><p className="mt-3 text-[9px] leading-4 text-blue-200/70">Booking charges are deducted automatically after confirmation.</p></div><button onClick={()=>go('wallet')} className="mt-5 text-[10px] font-bold text-brand">Add money & view ledger →</button></section>

        <section className="card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.15em] text-brand">Updates</p><h2 className="font-display mt-1 text-base font-semibold text-navy">Recent activity</h2></div><Bell size={20} className="text-brand"/></div><div className="mt-5 space-y-4">{activity.map(({icon:Icon,title,meta,color})=><div key={title} className="flex gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${color}`}><Icon size={16}/></span><div><strong className="block text-[10px] leading-4 text-navy">{title}</strong><span className="mt-1 block text-[9px] text-slate-400">{meta}</span></div></div>)}</div><button onClick={()=>go('shipments')} className="mt-5 text-[10px] font-bold text-brand">Review all movements →</button></section>
      </div>
    </div>
  </div>
}

function RateCalculator({ toast }) {
  const query = new URLSearchParams(window.location.hash.split('?')[1] || '')
  const [form,setForm]=useState({origin:query.get('origin')||'DEL',destination:query.get('destination')||'DXB',pieces:1,weight:100,length:60,width:50,height:40,type:'auto'}),[results,setResults]=useState(null)
  const update=e=>setForm({...form,[e.target.name]:e.target.value})
  const calculate=async e=>{e.preventDefault();const vol=(+form.length*+form.width*+form.height*Math.max(1,+form.pieces))/6000;const charge=form.type==='actual'?+form.weight:form.type==='volumetric'?vol:Math.max(+form.weight,vol);const base=form.destination==='DXB'?168:195;const fallback={vol:vol.toFixed(1),charge:Math.ceil(charge),options:[{carrier:'Alliance Priority',flight:'Direct · Daily',time:'1–2 days',rate:Math.ceil(charge*base),best:true},{carrier:'Alliance Standard',flight:'1 stop · Mon–Sat',time:'2–3 days',rate:Math.ceil(charge*(base-24))},{carrier:'Alliance Economy',flight:'Consolidated',time:'3–5 days',rate:Math.ceil(charge*(base-41))}]};setResults(fallback);try{const live=await api.post('/api/rates/quote',{...form,volumetricWeight:vol,chargeableWeight:Math.ceil(charge)});if(live?.options?.length)setResults({...fallback,...live})}catch{}}
  return <div className="fade"><PageTitle eyebrow="Cargo tools" title="Compare air cargo rates" text="Calculate chargeable weight and review static sample carrier options."/><div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]"><form onSubmit={calculate} className="card p-6"><div className="grid gap-4 sm:grid-cols-2">{[['Origin','origin'],['Destination','destination']].map(([l,n])=><label key={n} className="field-label">{l}<select name={n} className="field mt-2" value={form[n]} onChange={update}>{['DEL','BOM','BLR','MAA','DXB','FRA','LHR','SIN','HKG'].map(x=><option key={x}>{x}</option>)}</select></label>)}<label className="field-label">Pieces<input name="pieces" min="1" type="number" className="field mt-2" value={form.pieces} onChange={update}/></label><label className="field-label">Actual weight (kg)<input name="weight" min="1" type="number" className="field mt-2" value={form.weight} onChange={update}/></label></div><p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Dimensions per piece (cm)</p><div className="mt-3 grid grid-cols-3 gap-3">{['length','width','height'].map(n=><label key={n} className="field-label capitalize">{n}<input name={n} min="1" type="number" className="field mt-2" value={form[n]} onChange={update}/></label>)}</div><label className="field-label mt-4">Chargeable type<select name="type" className="field mt-2" value={form.type} onChange={update}><option value="auto">Auto — higher of both</option><option value="actual">Actual weight</option><option value="volumetric">Volumetric weight</option></select></label><button className="btn-primary mt-5 w-full"><Calculator size={17}/> Calculate rates</button></form>
      <div>{!results?<div className="card grid min-h-[390px] place-items-center p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky text-brand"><CircleDollarSign size={28}/></span><h3 className="font-display mt-5 font-semibold text-navy">Your rate options will appear here</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Enter the cargo details to compare volumetric and actual weight.</p></div></div>:<div className="space-y-3"><div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-200 bg-white p-4"><small className="text-[10px] uppercase tracking-wider text-slate-400">Volumetric</small><strong className="mt-1 block text-lg text-navy">{results.vol} kg</strong></div><div className="rounded-xl bg-navy p-4 text-white"><small className="text-[10px] uppercase tracking-wider text-blue-300">Chargeable</small><strong className="mt-1 block text-lg">{results.charge} kg</strong></div></div>{results.options.map(o=><div key={o.carrier} className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${o.best?'border-blue-300 ring-2 ring-blue-50':''}`}><div>{o.best&&<span className="mb-2 inline-block rounded-full bg-gold px-2 py-1 text-[9px] font-bold uppercase text-navy">Best value</span>}<h3 className="font-display font-semibold text-navy">{o.carrier}</h3><p className="mt-1 text-xs text-slate-500">{o.flight} · {o.time}</p></div><div className="sm:text-right"><strong className="font-display text-xl text-navy">₹{o.rate.toLocaleString('en-IN')}</strong><small className="block text-[10px] text-slate-400">Taxes extra</small><button onClick={()=>{localStorage.setItem('aac_selected_rate',JSON.stringify({...o,...form,charge:results.charge}));toast('Rate selected. Booking form is ready.');go('booking')}} className="mt-2 text-xs font-bold text-brand">Select & book →</button></div></div>)}</div>}</div></div></div>
}

function Booking({ addShipment, toast, wallet, onWalletChange }) {
  const selected=JSON.parse(localStorage.getItem('aac_selected_rate')||'null')
  const today=new Date().toISOString().slice(0,10)
  const savedDraft=useMemo(()=>{try{return JSON.parse(localStorage.getItem('aac_booking_draft')||'null')}catch{return null}},[])
  const baseForm={origin:selected?.origin||'DEL',destination:selected?.destination||'DXB',bookingDate:today,commodity:'General cargo',service:selected?.carrier||'Alliance Priority',pieces:selected?.pieces||3,actualWeight:25,length:12,width:15,height:16,pickup:'',shipper:'',shipperAccount:'',consignee:'',consigneeAccount:'',instructions:'',carrierAgentName:'',agentCity:'',iataCode:'',carrierAccountNumber:''}
  const restoredForm={...baseForm,...savedDraft?.form,bookingDate:savedDraft?.form?.bookingDate>=today?savedDraft.form.bookingDate:today,pickup:savedDraft?.form?.pickup>=today?savedDraft.form.pickup:''}
  const [form,setForm]=useState(restoredForm)
  const [extraServices,setExtraServices]=useState(savedDraft?.extraServices||['handleWithCare'])
  const [freight,setFreight]=useState(savedDraft?.freight||null),[calculating,setCalculating]=useState(false),[selectedFlight,setSelectedFlight]=useState(savedDraft?.selectedFlight||null)
  const [lookup,setLookup]=useState({status:'idle',message:''}),[submitting,setSubmitting]=useState(false)
  const liveWeights=useMemo(()=>calculateLocalFreight(form,extraServices).weights,[form.actualWeight,form.length,form.width,form.height,form.pieces,extraServices])
  const calculationFields=['origin','destination','bookingDate','commodity','service','pieces','actualWeight','length','width','height']

  const update=e=>{
    const {name,value}=e.target
    setForm(current=>{
      const next=name==='consigneeAccount'?{...current,[name]:value,consignee:'',carrierAgentName:'',agentCity:'',iataCode:'',carrierAccountNumber:''}:{...current,[name]:value}
      if(name==='bookingDate'&&next.pickup&&next.pickup>value)next.pickup=value
      return next
    })
    if(name==='consigneeAccount')setLookup({status:'idle',message:''})
    if(calculationFields.includes(name)){setFreight(null);setSelectedFlight(null)}
  }
  const toggleService=key=>{setExtraServices(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);setFreight(null);setSelectedFlight(null)}
  const chooseFlight=flight=>{setSelectedFlight(flight);setForm(current=>({...current,pickup:current.pickup&&current.pickup<=flight.date?current.pickup:today}))}

  useEffect(()=>{
    const entered=form.consigneeAccount.trim(), normalized=normalizeAgentAccount(entered)
    if(!entered||normalized.length<6){setLookup({status:'idle',message:''});return}
    let cancelled=false
    setLookup({status:'loading',message:'Checking approved agent directory...'})
    const timer=setTimeout(async()=>{let details;try{details=(await api.get(`/api/agents/lookup/${encodeURIComponent(entered)}`))?.agent}catch{details=demoAgentDirectory[normalized]}if(cancelled)return;if(details){setForm(current=>normalizeAgentAccount(current.consigneeAccount)===normalized?{...current,...details}:current);setLookup({status:'found',message:'Approved agent details fetched successfully.'})}else setLookup({status:'not-found',message:'No approved agent was found for this account number.'})},450)
    return()=>{cancelled=true;clearTimeout(timer)}
  },[form.consigneeAccount])

  useEffect(()=>{localStorage.setItem('aac_booking_draft',JSON.stringify({form,extraServices,freight,selectedFlight,savedAt:new Date().toISOString()}))},[form,extraServices,freight,selectedFlight])

  const calculateFreight=async()=>{
    if(!form.bookingDate||Number(form.actualWeight)<=0||Number(form.length)<=0||Number(form.width)<=0||Number(form.height)<=0||Number(form.pieces)<=0)return toast('Enter booking date, weight, pieces and complete dimensions first.')
    setCalculating(true);setSelectedFlight(null)
    const fallback=calculateLocalFreight(form,extraServices)
    try{const result=await api.post('/api/freight/calculate',{...form,extraServices});setFreight(result?.charges?.length?result:fallback)}catch{setFreight(fallback)}finally{setCalculating(false);setTimeout(()=>document.getElementById('freight-result')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
  }
  const submit=async e=>{
    e.preventDefault()
    if(!freight)return toast('Calculate freight before confirming the booking.')
    if(!selectedFlight)return toast('Select an available flight for this shipment.')
    if(!form.pickup)return toast('Select a pickup date before confirming the booking.')
    if(form.pickup>selectedFlight.date)return toast('Pickup date cannot be after the selected flight date.')
    if(lookup.status!=='found')return toast('Verify the consignee account number before booking.')
    if(wallet?.status!=='Active')return toast('Your wallet is frozen. Contact support before booking.')
    if(Number(wallet?.balance||0)<Number(freight.total))return toast(`Insufficient wallet balance. Add ${inr(Number(freight.total)-Number(wallet?.balance||0))} to continue.`)
    const awb=`AAC-${String(Date.now()).slice(-8)}`
    const booking={awb,origin:form.origin,destination:form.destination,commodity:form.commodity,weight:freight.weights.chargeableWeight,status:'Booked',milestone:'Booking confirmed',eta:`${selectedFlight.date} · ${selectedFlight.arrival}`,progress:15,flight:selectedFlight.flightNumber,total:freight.total}
    setSubmitting(true)
    try{
      const result=await api.post('/api/bookings',{...form,...booking,extraServices,selectedFlight})
      addShipment(result?.booking||booking)
      if(result?.wallet)onWalletChange(result.wallet,result.transaction)
      localStorage.removeItem('aac_selected_rate');localStorage.removeItem('aac_booking_draft')
      toast(`Booking confirmed and ${inr(freight.total)} deducted from wallet. AWB ${awb}`)
      go('shipments')
    }catch(error){toast(error.message||'Booking could not be confirmed.')}finally{setSubmitting(false)}
  }
  const lookupIcon=lookup.status==='loading'?<LoaderCircle size={17} className="animate-spin text-brand"/>:lookup.status==='found'?<CheckCircle2 size={17} className="text-green-600"/>:<Search size={17} className="text-slate-400"/>
  const serviceCards=[['handleWithCare','Handle with care','Dedicated careful loading and movement',ShieldCheck],['priorityHandling','Priority handling','Faster acceptance and warehouse processing',Zap],['temperatureControl','Temperature control','Monitored handling for sensitive cargo',Gauge]]
  const pickupMaxDate=selectedFlight?.date||form.bookingDate
  const walletReady=Boolean(wallet?.status==='Active'&&(!freight||Number(wallet.balance)>=Number(freight.total)))
  const bookingReady=Boolean(freight&&selectedFlight&&form.pickup&&form.pickup<=selectedFlight.date&&lookup.status==='found'&&walletReady&&!submitting)
  const displayDate=form.bookingDate?new Date(`${form.bookingDate}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'Select date'
  const jumpTo=id=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})
  const bookingSteps=[{number:'1',label:'Cargo details',target:'cargo-details',complete:true,enabled:true},{number:'2',label:'Freight summary',target:'freight-result',complete:Boolean(freight),enabled:Boolean(freight)},{number:'3',label:'Select flight',target:'flight-selection',complete:Boolean(selectedFlight),enabled:Boolean(freight)},{number:'4',label:'Confirm',target:'booking-confirm',complete:bookingReady,enabled:Boolean(selectedFlight)}]

  return <div className="fade"><PageTitle eyebrow="New shipment" title="Plan and book air cargo" text="Enter cargo details, calculate the complete freight, choose an available flight and confirm your booking."/>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-[10px] font-semibold text-green-700"><CheckCircle2 size={14}/> Draft auto-saved in this browser</p><span className="text-[9px] text-slate-400">Move between steps without losing entered data</span></div>
    <nav aria-label="Booking steps" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{bookingSteps.map(step=><button type="button" key={step.number} disabled={!step.enabled} onClick={()=>jumpTo(step.target)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${step.complete?'border-blue-200 bg-sky':'border-slate-200 bg-white'} ${step.enabled?'cursor-pointer hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md':'cursor-not-allowed opacity-55'}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${step.complete?'bg-brand text-white':'bg-slate-100 text-slate-400'}`}>{step.complete?<Check size={13}/>:step.number}</span><span className={`text-[10px] font-bold ${step.complete?'text-navy':'text-slate-400'}`}>{step.label}</span><ChevronRight size={14} className="ml-auto text-slate-300"/></button>)}</nav>
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-6">
      <section id="cargo-details" className="card scroll-mt-28 overflow-hidden"><div className="border-b border-slate-100 bg-sky p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm"><Box size={20}/></span><div><h2 className="font-display font-semibold text-navy">Route & cargo details</h2><p className="mt-1 text-xs leading-5 text-slate-500">Volumetric and chargeable weights update automatically.</p></div></div></div><div className="p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="field-label">Origin *<select name="origin" className="field mt-2" value={form.origin} onChange={update}>{['DEL','BOM','BLR','MAA','CCU','DXB','FRA','LHR','SIN','HKG'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field-label">Destination *<select name="destination" className="field mt-2" value={form.destination} onChange={update}>{['DXB','FRA','LHR','SIN','HKG','DEL','BOM','BLR','MAA','CCU'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field-label">Booking date *<input required min={today} type="date" name="bookingDate" className="field mt-2" value={form.bookingDate} onChange={update}/></label><label className="field-label">Commodity *<select name="commodity" className="field mt-2" value={form.commodity} onChange={update}>{['General cargo','Automotive parts','Electronics','Pharma supplies','Perishables','Garments','Documents'].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="mt-6 rounded-xl border border-slate-200 p-4 sm:p-5"><div className="flex items-center justify-between"><div><span className="text-[9px] font-bold uppercase tracking-[.15em] text-brand">Package line 1</span><h3 className="font-display mt-1 text-sm font-semibold text-navy">Cargo dimensions</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-bold text-slate-500">Centimetres</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><label className="field-label">Actual weight (kg) *<input required min="0.1" step="0.1" type="number" name="actualWeight" className="field mt-2" value={form.actualWeight} onChange={update}/></label><label className="field-label">Pieces *<input required min="1" type="number" name="pieces" className="field mt-2" value={form.pieces} onChange={update}/></label>{[['Length','length'],['Width','width'],['Height','height']].map(([label,name])=><label key={name} className="field-label">{label} (cm) *<input required min="1" step="0.1" type="number" name={name} className="field mt-2" value={form[name]} onChange={update}/></label>)}</div></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Total actual weight',liveWeights.totalActualWeight],['Total volumetric weight',liveWeights.totalVolumetricWeight],['Chargeable weight',liveWeights.chargeableWeight]].map(([label,value],index)=><div key={label} className={`rounded-xl p-4 ${index===2?'bg-navy text-white':'bg-slate-50 text-navy'}`}><span className={`text-[9px] uppercase tracking-wider ${index===2?'text-blue-300':'text-slate-400'}`}>{label}</span><strong className="font-display mt-2 block text-xl">{Number(value).toFixed(2)} kg</strong></div>)}</div><p className="mt-3 text-[9px] leading-4 text-slate-400">Formula: (L × W × H × pieces) ÷ 6000. Chargeable weight is the higher of actual, volumetric or minimum 25 kg.</p></div></section>

      <section className="card p-5 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display font-semibold text-navy">Service & handling</h2><p className="mt-1 text-xs text-slate-500">Optional services are priced separately in the freight summary.</p></div><label className="field-label sm:w-56">Freight service<select name="service" className="field mt-2" value={form.service} onChange={update}>{['Alliance Priority','Alliance Standard','Alliance Economy'].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{serviceCards.map(([key,title,text,Icon])=>{const checked=extraServices.includes(key);return <label key={key} className={`cursor-pointer rounded-xl border p-4 transition ${checked?'border-blue-300 bg-sky ring-2 ring-blue-50':'border-slate-200 hover:border-blue-200'}`}><div className="flex items-start justify-between"><span className={`grid h-9 w-9 place-items-center rounded-lg ${checked?'bg-brand text-white':'bg-slate-100 text-slate-500'}`}><Icon size={17}/></span><input type="checkbox" checked={checked} onChange={()=>toggleService(key)} className="accent-brand"/></div><strong className="mt-4 block text-xs text-navy">{title}</strong><span className="mt-1 block text-[9px] leading-4 text-slate-500">{text}</span><span className="mt-3 block text-[9px] font-bold text-brand">Admin-controlled charge</span></label>})}</div><button type="button" onClick={calculateFreight} disabled={calculating} className="btn-primary mt-6 w-full py-3.5">{calculating?<LoaderCircle size={17} className="animate-spin"/>:<Calculator size={17}/>} Calculate freight</button></section>

      {freight&&<section id="freight-result" className="card scroll-mt-28 overflow-hidden"><div className="flex flex-col gap-4 border-b border-blue-100 bg-sky p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><span className="text-[9px] font-bold uppercase tracking-[.16em] text-brand">Calculation result</span><h2 className="font-display mt-1 text-lg font-semibold text-navy">Complete freight summary</h2><p className="mt-1 text-xs text-slate-500">{form.origin} → {form.destination} · {displayDate}</p><span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${freight.pricingSource==='super-admin'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}><CheckCircle2 size={12}/>{freight.pricingSource==='super-admin'?'Synced with Super Admin charge controls':'Standard tariff fallback'}</span></div><div className="rounded-xl bg-navy px-5 py-3 text-white sm:text-right"><span className="text-[9px] uppercase tracking-wider text-blue-300">Grand total</span><strong className="font-display mt-1 block text-2xl">{inr(freight.total)}</strong></div></div><div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[.36fr_.64fr]"><div className="space-y-3">{[['Actual weight',freight.weights.totalActualWeight],['Volumetric weight',freight.weights.totalVolumetricWeight],['Chargeable weight',freight.weights.chargeableWeight]].map(([label,value],index)=><div key={label} className={`rounded-xl p-4 ${index===2?'bg-blue-50':'bg-slate-50'}`}><span className="text-[9px] text-slate-400">{label}</span><strong className="font-display mt-1 block text-lg text-navy">{Number(value).toFixed(2)} kg</strong></div>)}</div><div className="overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[1fr_auto] bg-slate-50 px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400"><span>Charge head</span><span>Amount</span></div><div className="divide-y divide-slate-100">{freight.charges.map(row=><div key={row.key} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-[10px]"><div><strong className="text-slate-700">{row.label}</strong>{row.detail&&<span className="mt-1 block text-[9px] text-slate-400">{row.detail}</span>}</div><strong className="text-navy">{inr(row.amount)}</strong></div>)}</div><div className="grid grid-cols-[1fr_auto] bg-navy px-4 py-4 text-sm text-white"><strong>Grand total freight</strong><strong className="font-display text-lg">{inr(freight.total)}</strong></div></div></div></section>}

      {freight&&<section id="flight-selection" className="card scroll-mt-28 overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><span className="text-[9px] font-bold uppercase tracking-[.16em] text-brand">Live availability</span><h2 className="font-display mt-1 text-lg font-semibold text-navy">Choose a flight</h2><p className="mt-1 text-xs text-slate-500">Available on {displayDate} from {form.origin} to {form.destination}</p></div><Plane size={22} className="text-brand"/></div><div className="space-y-3 p-4 sm:p-6">{freight.flights.map(flight=>{const chosen=selectedFlight?.id===flight.id;return <button type="button" key={flight.id} onClick={()=>chooseFlight(flight)} className={`w-full rounded-xl border p-4 text-left transition sm:p-5 ${chosen?'border-blue-400 bg-sky ring-2 ring-blue-100':'border-slate-200 hover:border-blue-200'}`}><div className="grid gap-4 sm:grid-cols-[.7fr_1fr_.8fr_.8fr_auto] sm:items-center"><div><span className="text-[9px] text-slate-400">Flight</span><strong className="mt-1 block text-sm text-navy">{flight.flightNumber}</strong><span className="mt-1 block text-[9px] text-green-600">{flight.status}</span></div><div className="flex items-center gap-3"><div><strong className="font-display text-lg text-navy">{flight.departure}</strong><span className="block text-[9px] text-slate-400">{flight.origin}</span></div><span className="flex flex-1 items-center text-brand"><span className="h-px flex-1 bg-blue-200"/><Plane className="mx-2" size={16}/><span className="h-px flex-1 bg-blue-200"/></span><div className="text-right"><strong className="font-display text-lg text-navy">{flight.arrival}</strong><span className="block text-[9px] text-slate-400">{flight.destination}</span></div></div><div><span className="text-[9px] text-slate-400">Aircraft</span><strong className="mt-1 block text-[10px] text-navy">{flight.aircraft}</strong><span className="mt-1 block text-[9px] text-slate-400">{flight.stops} · {flight.duration}</span></div><div><span className="text-[9px] text-slate-400">Cargo cutoff</span><strong className="mt-1 block text-[10px] text-navy">{flight.cutoff}</strong><span className="mt-1 block text-[9px] text-slate-400">{Number(flight.availableCapacity).toLocaleString('en-IN')} kg free</span></div><span className={`grid h-8 w-8 place-items-center rounded-full ${chosen?'bg-brand text-white':'border border-slate-200 text-transparent'}`}><Check size={15}/></span></div></button>})}</div></section>}

      <section className="card p-5 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display font-semibold text-navy">Parties & account lookup</h2><p className="mt-1 text-xs leading-5 text-slate-500">Consignee verification fills approved carrier details automatically.</p></div><button type="button" onClick={()=>setForm(current=>({...current,consigneeAccount:'66-9896496',consignee:'',carrierAgentName:'',agentCity:'',iataCode:'',carrierAccountNumber:''}))} className="w-fit text-xs font-bold text-brand">Use demo: 66-9896496</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="field-label">Shipper account number<input name="shipperAccount" className="field mt-2" value={form.shipperAccount} onChange={update}/></label><label className="field-label">Consignee account number *<span className="relative mt-2 block"><input required name="consigneeAccount" className={`field pr-11 ${lookup.status==='found'?'border-green-300':lookup.status==='not-found'?'border-red-300':''}`} value={form.consigneeAccount} onChange={update} placeholder="e.g. 66-9896496"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{lookupIcon}</span></span></label><label className="field-label">Shipper company *<input required name="shipper" className="field mt-2" value={form.shipper} onChange={update}/></label><label className="field-label">Consignee company *<input required name="consignee" className="field mt-2" value={form.consignee} onChange={update}/></label></div>{lookup.message&&<p role="status" className={`mt-4 rounded-lg px-3 py-2.5 text-xs font-semibold ${lookup.status==='found'?'bg-green-50 text-green-700':lookup.status==='not-found'?'bg-red-50 text-red-700':'bg-blue-50 text-brand'}`}>{lookup.message}</p>}<div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{[["Issuing carrier's agent",form.carrierAgentName],['City',form.agentCity],["Agent's IATA code",form.iataCode],['Account number',form.carrierAccountNumber]].map(([label,value])=><div key={label}><span className="text-[9px] uppercase tracking-wider text-slate-400">{label}</span><strong className="mt-1 block min-h-4 text-xs text-navy">{value||'Auto-filled after verification'}</strong></div>)}</div></section>
      <section className="card p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-brand"><Truck size={19}/></span><div><h2 className="font-display font-semibold text-navy">Pickup & instructions</h2><p className="mt-1 text-xs leading-5 text-slate-500">Pickup must happen before departure and can never be scheduled after the selected flight date.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="field-label">Preferred pickup date *<input required min={today} max={pickupMaxDate} type="date" name="pickup" className="field mt-2" value={form.pickup} onChange={update}/><span className="mt-2 block text-[9px] font-medium text-slate-400">Allowed: {today} to {pickupMaxDate}. Selected flight: {selectedFlight?`${selectedFlight.flightNumber} on ${selectedFlight.date}`:'choose a flight first'}.</span></label><label className="field-label">Special instructions<input name="instructions" className="field mt-2" value={form.instructions} onChange={update} placeholder="Access, packaging or handling note"/></label></div>{selectedFlight&&<div className="mt-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-[10px] leading-5 text-green-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0"/><span>Pickup date is locked to on or before <strong>{selectedFlight.date}</strong>, ahead of the {selectedFlight.departure} flight departure and {selectedFlight.cutoff} cargo cutoff.</span></div>}</section>
    </div>

    <aside id="booking-confirm" className="card h-fit scroll-mt-28 overflow-hidden xl:sticky xl:top-28"><div className="bg-navy p-5 text-white sm:p-6"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-blue-300">Booking summary</span><div className="mt-4 flex items-center justify-between"><strong className="font-display text-2xl">{form.origin}</strong><span className="flex items-center text-gold"><span className="h-px w-7 bg-blue-300"/><Plane className="mx-2" size={19}/><span className="h-px w-7 bg-blue-300"/></span><strong className="font-display text-2xl">{form.destination}</strong></div><p className="mt-3 text-center text-[10px] text-blue-200">{displayDate}</p></div><div className="p-5 sm:p-6"><dl className="space-y-3 text-[10px]">{[['Commodity',form.commodity],['Service',form.service],['Actual weight',`${liveWeights.totalActualWeight.toFixed(2)} kg`],['Volumetric',`${liveWeights.totalVolumetricWeight.toFixed(2)} kg`],['Chargeable',`${liveWeights.chargeableWeight.toFixed(2)} kg`],['Extra services',extraServices.length?`${extraServices.length} selected`:'None'],['Flight',selectedFlight?.flightNumber||'Not selected']].map(([label,value])=><div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-3"><dt className="text-slate-400">{label}</dt><dd className="max-w-[60%] text-right font-bold text-navy">{value}</dd></div>)}</dl><div className={`mt-5 rounded-xl p-4 ${freight?'bg-green-50':'bg-slate-50'}`}><span className="text-[9px] uppercase tracking-wider text-slate-400">Grand total freight</span><strong className={`font-display mt-1 block text-2xl ${freight?'text-green-700':'text-slate-300'}`}>{freight?inr(freight.total):'Calculate first'}</strong></div><div className={`mt-3 rounded-xl border p-4 ${walletReady?'border-blue-100 bg-sky':'border-red-200 bg-red-50'}`}><div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Wallet balance</span><Badge value={wallet?.status||'Loading'}/></div><strong className="font-display mt-2 block text-lg text-navy">{inr(wallet?.balance||0)}</strong>{freight&&<p className={`mt-1 text-[9px] font-semibold ${walletReady?'text-green-700':'text-red-600'}`}>{walletReady?`${inr(Number(wallet.balance)-Number(freight.total))} balance after booking`:`Add ${inr(Number(freight.total)-Number(wallet?.balance||0))} before booking`}</p>}<button type="button" onClick={()=>go('wallet')} className="mt-3 text-[9px] font-bold text-brand">Add money to wallet →</button></div><label className="mt-5 flex items-start gap-2 text-[10px] leading-4 text-slate-500"><input required type="checkbox" className="mt-0.5 accent-brand"/> I confirm cargo details, selected flight, wallet debit and carriage terms.</label><button className="btn-primary mt-5 w-full" disabled={!bookingReady}>{submitting?<LoaderCircle className="animate-spin" size={17}/>:<PackageCheck size={17}/>} {submitting?'Confirming & paying…':'Pay from wallet & book'}</button>{!bookingReady&&<p className="mt-3 text-center text-[9px] leading-4 text-slate-400">{!walletReady?'Add sufficient wallet balance or contact support.':'Calculate freight, select a flight and verify consignee account.'}</p>}<button type="button" onClick={()=>jumpTo(selectedFlight?'flight-selection':freight?'freight-result':'cargo-details')} className="mt-4 flex w-full items-center justify-center gap-2 text-[10px] font-bold text-brand"><ArrowLeft size={14}/> Back to previous step</button></div></aside>
    </form>
  </div>
}

function LegacyBooking({ addShipment, toast }) {
  const selected=JSON.parse(localStorage.getItem('aac_selected_rate')||'null')
  const [form,setForm]=useState({
    origin:selected?.origin||'DEL', destination:selected?.destination||'DXB', pieces:selected?.pieces||1,
    weight:selected?.charge||100, commodity:'General cargo', service:selected?.carrier||'Alliance Priority',
    pickup:'', shipper:'', shipperAccount:'', consignee:'', consigneeAccount:'', instructions:'',
    carrierAgentName:'', agentCity:'', iataCode:'', carrierAccountNumber:'',
  })
  const [lookup,setLookup]=useState({ status:'idle', message:'' })

  const update=e=>{
    const { name, value } = e.target
    setForm(current => name === 'consigneeAccount'
      ? { ...current, [name]:value, consignee:'', carrierAgentName:'', agentCity:'', iataCode:'', carrierAccountNumber:'' }
      : { ...current, [name]:value })
    if(name === 'consigneeAccount') setLookup({ status:'idle', message:'' })
  }

  useEffect(()=>{
    const enteredAccount = form.consigneeAccount.trim()
    const normalized = normalizeAgentAccount(enteredAccount)
    if(!enteredAccount || normalized.length < 6) {
      setLookup({ status:'idle', message:'' })
      return
    }

    let cancelled = false
    setLookup({ status:'loading', message:'Checking approved agent directory...' })
    const timer = setTimeout(async()=>{
      let details
      try {
        const result = await api.get(`/api/agents/lookup/${encodeURIComponent(enteredAccount)}`)
        details = result?.agent
      } catch {
        details = demoAgentDirectory[normalized]
      }
      if(cancelled) return
      if(details) {
        setForm(current => normalizeAgentAccount(current.consigneeAccount) === normalized
          ? { ...current, ...details }
          : current)
        setLookup({ status:'found', message:'Approved agent details fetched successfully.' })
      } else {
        setLookup({ status:'not-found', message:'No approved agent was found for this account number.' })
      }
    }, 450)

    return()=>{ cancelled=true; clearTimeout(timer) }
  },[form.consigneeAccount])

  const submit=e=>{
    e.preventDefault()
    if(lookup.status !== 'found') return toast('Enter a valid consignee account number and wait for verification.')
    const awb=`AAC-${String(Date.now()).slice(-8)}`
    const booking={awb,origin:form.origin,destination:form.destination,commodity:form.commodity,weight:+form.weight,status:'Booked',milestone:'Booking confirmed',eta:'Schedule pending',progress:15}
    addShipment(booking)
    api.post('/api/bookings',{...form,awb}).catch(()=>{})
    localStorage.removeItem('aac_selected_rate')
    toast(`Booking confirmed. AWB ${awb}`)
    go('shipments')
  }

  const lookupIcon = lookup.status === 'loading'
    ? <LoaderCircle size={17} className="animate-spin text-brand"/>
    : lookup.status === 'found'
      ? <CheckCircle2 size={17} className="text-green-600"/>
      : <Search size={17} className="text-slate-400"/>

  return <div className="fade">
    <PageTitle eyebrow="New shipment" title="Create cargo booking" text="Capture shipment, account and pickup details for your cargo booking."/>
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_.42fr]">
      <div className="space-y-6">
        <section className="card p-5 sm:p-6">
          <h2 className="font-display font-semibold text-navy">Route & shipment</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[['Origin','origin'],['Destination','destination']].map(([label,name])=><label key={name} className="field-label">{label} *<select name={name} className="field mt-2" value={form[name]} onChange={update}>{['DEL','BOM','BLR','MAA','CCU','DXB','FRA','LHR','SIN','HKG'].map(x=><option key={x}>{x}</option>)}</select></label>)}
            <label className="field-label">Commodity *<select name="commodity" className="field mt-2" value={form.commodity} onChange={update}>{['General cargo','Automotive parts','Electronics','Pharma supplies','Perishables','Garments','Documents'].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="field-label">Service<select name="service" className="field mt-2" value={form.service} onChange={update}>{['Alliance Priority','Alliance Standard','Alliance Economy'].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="field-label">Pieces *<input required min="1" type="number" name="pieces" className="field mt-2" value={form.pieces} onChange={update}/></label>
            <label className="field-label">Chargeable weight (kg) *<input required min="1" type="number" name="weight" className="field mt-2" value={form.weight} onChange={update}/></label>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="font-display font-semibold text-navy">Parties & account lookup</h2><p className="mt-1 text-xs leading-5 text-slate-500">Consignee account verification fills the approved carrier details automatically.</p></div>
            <button type="button" onClick={()=>setForm(current=>({...current,consigneeAccount:'66-9896496',consignee:'',carrierAgentName:'',agentCity:'',iataCode:'',carrierAccountNumber:''}))} className="w-fit text-xs font-bold text-brand hover:text-blue-800">Use demo: 66-9896496</button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="field-label">Shipper account number<input name="shipperAccount" autoComplete="off" className="field mt-2" value={form.shipperAccount} onChange={update} placeholder="Enter shipper account"/></label>
            <label className="field-label">Consignee account number *<span className="relative mt-2 block"><input required name="consigneeAccount" autoComplete="off" className={`field pr-11 ${lookup.status==='found'?'border-green-300 focus:border-green-500 focus:ring-green-100':lookup.status==='not-found'?'border-red-300 focus:border-red-500 focus:ring-red-100':''}`} value={form.consigneeAccount} onChange={update} placeholder="e.g. 66-9896496"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{lookupIcon}</span></span></label>
            <label className="field-label">Shipper company *<input required name="shipper" className="field mt-2" value={form.shipper} onChange={update}/></label>
            <label className="field-label">Consignee company *<input required name="consignee" className="field mt-2" value={form.consignee} onChange={update}/></label>
          </div>
          {lookup.message&&<p role="status" className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold ${lookup.status==='found'?'bg-green-50 text-green-700':lookup.status==='not-found'?'bg-red-50 text-red-700':'bg-blue-50 text-brand'}`}>{lookup.status==='loading'?<LoaderCircle size={15} className="animate-spin"/>:lookup.status==='found'?<CheckCircle2 size={15}/>:<Search size={15}/>} {lookup.message}</p>}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-blue-100 bg-sky p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm"><Building2 size={20}/></span><div><h2 className="font-display font-semibold text-navy">Carrier / Agent details</h2><p className="mt-1 text-xs leading-5 text-slate-500">These details are fetched securely from the approved account directory and cannot be edited in a booking.</p></div></div>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <label className="field-label">Issuing carrier's agent name<input required readOnly className="field mt-2 bg-slate-50 text-slate-600" value={form.carrierAgentName} placeholder="Auto-filled after verification"/></label>
            <label className="field-label">City<input required readOnly className="field mt-2 bg-slate-50 text-slate-600" value={form.agentCity} placeholder="Auto-filled after verification"/></label>
            <label className="field-label">Agent's IATA code<input required readOnly className="field mt-2 bg-slate-50 font-semibold text-slate-600" value={form.iataCode} placeholder="Auto-filled after verification"/></label>
            <label className="field-label">Account number<input required readOnly className="field mt-2 bg-slate-50 font-semibold text-slate-600" value={form.carrierAccountNumber} placeholder="Auto-filled after verification"/></label>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-display font-semibold text-navy">Pickup instructions</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="field-label">Preferred pickup date<input type="date" name="pickup" className="field mt-2" value={form.pickup} onChange={update}/></label><label className="field-label">Special instructions<input name="instructions" className="field mt-2" value={form.instructions} onChange={update}/></label></div>
        </section>
      </div>

      <aside className="card h-fit p-5 sm:p-6 xl:sticky xl:top-28">
        <h2 className="font-display font-semibold text-navy">Booking summary</h2>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-sky p-4"><span className="font-display text-xl font-semibold text-navy">{form.origin}</span><span className="flex items-center gap-2 text-brand"><span className="h-px w-7 bg-blue-300"/><Plane size={18}/><span className="h-px w-7 bg-blue-300"/></span><span className="font-display text-xl font-semibold text-navy">{form.destination}</span></div>
        <dl className="mt-5 space-y-3 text-xs">{[['Service',form.service],['Pieces',form.pieces],['Chargeable weight',`${form.weight} kg`],['Consignee account',form.carrierAccountNumber||'Not verified'],['Issuing agent',form.carrierAgentName||'Not verified']].map(([label,value])=><div key={label} className="flex gap-3 justify-between border-b border-slate-100 pb-3"><dt className="text-slate-400">{label}</dt><dd className="max-w-[58%] text-right font-bold text-navy">{value}</dd></div>)}</dl>
        <label className="mt-5 flex items-start gap-2 text-[10px] leading-4 text-slate-500"><input required type="checkbox" className="mt-0.5 accent-brand"/> I confirm the shipment details and accept cargo carriage terms.</label>
        <button className="btn-primary mt-5 w-full" disabled={lookup.status!=='found'}><PackageCheck size={17}/> Confirm booking</button>
        {lookup.status!=='found'&&<p className="mt-3 text-center text-[10px] leading-4 text-slate-400">Verify the consignee account to enable booking.</p>}
      </aside>
    </form>
  </div>
}

function ShipmentTable({ shipments, compact=false }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-400">{['AWB number','Route','Commodity','Weight','Status'].map(x=><th key={x} className="px-5 py-3 font-bold">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{shipments.map(s=><tr key={s.awb} className="text-xs hover:bg-slate-50"><td className="px-5 py-4 font-bold text-brand">{s.awb}</td><td className="px-5 py-4 font-semibold text-navy">{s.origin} <span className="mx-1 text-slate-300">→</span> {s.destination}</td><td className="px-5 py-4 text-slate-500">{s.commodity}</td><td className="px-5 py-4 text-slate-500">{s.weight} kg</td><td className="px-5 py-4"><StatusBadge status={s.status}/></td></tr>)}</tbody></table>{!shipments.length&&<div className="p-10 text-center text-sm text-slate-400">No shipments found.</div>}</div>
}

function Shipments({ shipments }) { const [query,setQuery]=useState('');const filtered=shipments.filter(s=>Object.values(s).some(v=>String(v).toLowerCase().includes(query.toLowerCase())));return <div className="fade"><PageTitle eyebrow="Bookings" title="My shipments" text="Review every booking and its latest operational status." action={<button onClick={()=>go('booking')} className="btn-primary"><Plus size={16}/> New booking</button>}/><div className="card overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-xs"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} className="field search-field py-2.5" placeholder="Search AWB, route or commodity"/></div><select className="field w-full py-2.5 sm:w-36"><option>All statuses</option><option>Booked</option><option>In transit</option><option>Delivered</option></select></div><ShipmentTable shipments={filtered}/></div></div> }

function Track({ shipments }) {
  const params=new URLSearchParams((window.location.hash.split('?')[1]||'')), incoming=params.get('awb')||''
  const [awb,setAwb]=useState(incoming),[result,setResult]=useState(null),[searched,setSearched]=useState(false)
  const track=e=>{e?.preventDefault();setSearched(true);setResult(shipments.find(s=>s.awb.toLowerCase()===awb.trim().toLowerCase())||null)}
  useEffect(()=>{if(incoming)track()},[])
  const steps=['Booking confirmed','Cargo received','Customs cleared','Flight departed','Destination hub','Delivered']
  return <div className="fade"><PageTitle eyebrow="Shipment visibility" title="Track your air waybill" text="Enter an AWB to view its complete static-demo milestone journey."/><form onSubmit={track} className="card flex flex-col gap-3 p-4 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={19}/><input value={awb} onChange={e=>setAwb(e.target.value)} className="field search-field py-3" placeholder="Try 125-98765432" required/></div><button className="btn-primary px-7">Track shipment <ArrowRight size={16}/></button></form>{searched&&!result&&<div className="card mt-6 p-8 text-center"><Box className="mx-auto text-slate-300" size={36}/><h3 className="font-display mt-4 font-semibold text-navy">No shipment found</h3><p className="mt-2 text-sm text-slate-500">Check the number or try demo AWB <button onClick={()=>setAwb('125-98765432')} className="font-bold text-brand">125-98765432</button>.</p></div>}{result&&<div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.42fr]"><section className="card p-6 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Air waybill</span><h2 className="font-display mt-1 text-2xl font-semibold text-navy">{result.awb}</h2></div><StatusBadge status={result.status}/></div><div className="mt-7 flex items-center justify-between rounded-2xl bg-sky p-5 sm:p-7"><div><strong className="font-display text-2xl text-navy">{result.origin}</strong><span className="mt-1 block text-xs text-slate-500">Origin</span></div><div className="flex flex-1 items-center px-4 text-brand"><span className="h-px flex-1 bg-blue-200"/><Plane className="mx-3" size={22}/><span className="h-px flex-1 bg-blue-200"/></div><div className="text-right"><strong className="font-display text-2xl text-navy">{result.destination}</strong><span className="mt-1 block text-xs text-slate-500">Destination</span></div></div><div className="mt-8 space-y-0">{steps.map((s,i)=>{const complete=((i+1)/steps.length*100)<=result.progress+5;return <div key={s} className="flex gap-4"><div className="flex flex-col items-center"><span className={`grid h-7 w-7 place-items-center rounded-full ${complete?'bg-brand text-white':'bg-slate-100 text-slate-400'}`}>{complete?<Check size={13}/>:i+1}</span>{i<steps.length-1&&<span className={`h-10 w-0.5 ${complete?'bg-blue-200':'bg-slate-100'}`}/>}</div><div className="pt-1"><strong className={`block text-xs ${complete?'text-navy':'text-slate-400'}`}>{s}</strong>{complete&&s===result.milestone&&<small className="mt-1 block text-[10px] text-brand">Latest update</small>}</div></div>})}</div></section><aside className="space-y-4"><div className="card p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current milestone</p><h3 className="font-display mt-2 font-semibold text-navy">{result.milestone}</h3><p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14}/> ETA: {result.eta}</p></div><div className="card p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cargo details</p><dl className="mt-4 space-y-3 text-xs">{[['Commodity',result.commodity],['Weight',`${result.weight} kg`],['Progress',`${result.progress}%`]].map(([a,b])=><div key={a} className="flex justify-between"><dt className="text-slate-400">{a}</dt><dd className="font-bold text-navy">{b}</dd></div>)}</dl><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{width:`${result.progress}%`}}/></div></div></aside></div>}</div>
}

function WalletPage({ data, onWalletChange, onRefresh, toast }) {
  const wallet=data.wallet||defaultWallet.wallet, transactions=data.transactions||[]
  const [amount,setAmount]=useState(10000),[method,setMethod]=useState('UPI'),[loading,setLoading]=useState(false)
  const credits=transactions.filter(item=>item.direction==='credit').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const debits=transactions.filter(item=>item.direction==='debit').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const topUp=async e=>{e.preventDefault();if(Number(amount)<100)return toast('Minimum wallet top-up is ₹100.');setLoading(true);try{const result=await api.post('/api/wallet/top-up',{amount:Number(amount),method});onWalletChange(result.wallet,result.transaction);toast(`${inr(amount)} added to your wallet.`)}catch(error){toast(error.message||'Wallet top-up failed.')}finally{setLoading(false)}}
  return <div className="fade"><PageTitle eyebrow="Prepaid payments" title="Shipment wallet" text="Add money, review every credit and booking debit, and keep enough balance available before confirming cargo." action={<button onClick={onRefresh} className="btn-secondary"><RefreshCcw size={15}/> Refresh balance</button>}/><div className="grid gap-6 xl:grid-cols-[.78fr_1.22fr]"><div className="space-y-6"><section className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8"><div className="absolute -right-14 -top-16 h-48 w-48 rounded-full border border-white/10"/><div className="relative"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-gold"><WalletCards size={23}/></span><Badge value={wallet.status}/></div><span className="mt-8 block text-[10px] font-bold uppercase tracking-[.16em] text-blue-200">Available balance</span><strong className="font-display mt-2 block text-4xl">{inr(wallet.balance)}</strong><div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5 text-[10px]"><span className="text-blue-200">{wallet.businessName||'Alliance cargo account'}</span><span className="font-bold text-white">•••• {wallet.email?.slice(-4).toUpperCase()}</span></div></div></section><section className="card p-5 sm:p-6"><h2 className="font-display font-semibold text-navy">Add money</h2><p className="mt-1 text-[10px] leading-5 text-slate-500">Top up your prepaid balance before creating a shipment.</p><form onSubmit={topUp} className="mt-5 space-y-4"><label className="field-label">Amount (₹)<input min="100" max="500000" step="100" type="number" className="field mt-2" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><div className="grid grid-cols-3 gap-2">{[5000,10000,25000].map(value=><button type="button" key={value} onClick={()=>setAmount(value)} className={`rounded-lg border px-2 py-2 text-[10px] font-bold ${Number(amount)===value?'border-brand bg-sky text-brand':'border-slate-200 text-slate-500'}`}>+ {inr(value)}</button>)}</div><label className="field-label">Payment method<select className="field mt-2" value={method} onChange={e=>setMethod(e.target.value)}><option>UPI</option><option>Bank transfer</option><option>Debit card</option></select></label><button disabled={loading||wallet.status!=='Active'} className="btn-primary w-full">{loading?<LoaderCircle className="animate-spin" size={16}/>:<Plus size={16}/>} {loading?'Adding money…':'Add money securely'}</button></form>{wallet.status!=='Active'&&<p className="mt-3 rounded-lg bg-red-50 p-3 text-[10px] font-semibold text-red-700">This wallet is frozen by Super Admin. Contact support to reactivate it.</p>}</section></div><div><section className="grid gap-3 sm:grid-cols-3">{[[CircleDollarSign,'Current balance',inr(wallet.balance),'bg-blue-50 text-brand'],[Plus,'Total credits',inr(credits),'bg-green-50 text-green-600'],[ArrowRight,'Total debits',inr(debits),'bg-amber-50 text-amber-600']].map(([Icon,label,value,color])=><article key={label} className="card p-5"><span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={18}/></span><strong className="font-display mt-4 block text-lg text-navy">{value}</strong><span className="mt-1 block text-[10px] text-slate-500">{label}</span></article>)}</section><section className="card mt-6 overflow-hidden"><div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="font-display font-semibold text-navy">Wallet transactions</h2><p className="mt-1 text-[10px] text-slate-400">Credits, shipment deductions and admin adjustments</p></div><div className="divide-y divide-slate-100">{transactions.map(item=><article key={item.id} className="flex items-center gap-4 p-4 sm:p-5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-bold ${item.direction==='credit'?'bg-green-50 text-green-600':'bg-red-50 text-red-500'}`}>{item.direction==='credit'?'+':'−'}</span><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-navy">{item.type}</strong><span className="mt-1 block truncate text-[9px] text-slate-400">{item.reference||item.id} · {item.note||'Wallet transaction'}</span><span className="mt-1 block text-[9px] text-slate-400">{new Date(item.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div><div className="text-right"><strong className={`text-xs ${item.direction==='credit'?'text-green-600':'text-red-500'}`}>{item.direction==='credit'?'+':'−'}{inr(item.amount)}</strong><span className="mt-1 block text-[9px] text-slate-400">Bal. {inr(item.balanceAfter)}</span></div></article>)}{!transactions.length&&<div className="p-10 text-center text-xs text-slate-400">No wallet transactions yet.</div>}</div></section></div></div></div>
}

function Documents({ toast }) { const [files,setFiles]=useState([{name:'GST-Certificate.pdf',type:'Business KYC',date:'18 Jul 2026',status:'Verified'},{name:'invoice-AAC-1092.pdf',type:'Commercial invoice',date:'20 Jul 2026',status:'Uploaded'}]); const add=e=>{const f=e.target.files[0];if(!f)return;setFiles([{name:f.name,type:'Supporting document',date:'Today',status:'Uploaded'},...files]);toast(`${f.name} uploaded to this browser session.`)};return <div className="fade"><PageTitle eyebrow="Compliance" title="Document centre" text="Keep shipment and business documents organized in one secure place."/><label className="card flex cursor-pointer flex-col items-center justify-center border-dashed p-10 text-center transition hover:border-blue-300 hover:bg-sky"><span className="grid h-14 w-14 place-items-center rounded-full bg-sky text-brand"><Upload size={24}/></span><strong className="font-display mt-4 text-navy">Upload a document</strong><span className="mt-2 text-xs text-slate-400">PDF, JPG or PNG · Maximum 10 MB</span><input type="file" className="sr-only" onChange={add} accept=".pdf,image/*"/></label><div className="card mt-6 overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="font-display font-semibold text-navy">Recent documents</h2></div><div className="divide-y divide-slate-100">{files.map((f,i)=><div key={`${f.name}-${i}`} className="flex items-center gap-4 p-5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-500"><FileText size={19}/></span><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-navy">{f.name}</strong><small className="mt-1 block text-[10px] text-slate-400">{f.type} · {f.date}</small></div><span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">{f.status}</span></div>)}</div></div></div> }

function Profile({ user, toast }) { const [saved,setSaved]=useState({...user});return <div className="fade"><PageTitle eyebrow="Account" title="Company profile" text="Review your business information and operational preferences."/><div className="grid gap-6 xl:grid-cols-[.65fr_.35fr]"><form onSubmit={e=>{e.preventDefault();toast('Profile changes saved in this static session.')}} className="card p-6"><h2 className="font-display font-semibold text-navy">Business details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{[['Contact name','name'],['Business name','business'],['Registered email','email'],['Account role','role']].map(([l,n])=><label key={n} className="field-label">{l}<input disabled={n==='email'||n==='role'} className="field mt-2 disabled:bg-slate-50 disabled:text-slate-400" value={saved[n]||''} onChange={e=>setSaved({...saved,[n]:e.target.value})}/></label>)}</div><button className="btn-primary mt-6"><Check size={16}/> Save changes</button></form><aside className="space-y-5"><div className="card p-6"><span className="grid h-12 w-12 place-items-center rounded-full bg-green-50 text-green-600"><ShieldCheck size={22}/></span><h3 className="font-display mt-4 font-semibold text-navy">Account status</h3><p className="mt-2 text-sm font-bold text-green-600">{user.status}</p><p className="mt-2 text-xs leading-5 text-slate-500">Business verification and access controls are shown here.</p></div><div className="card p-6"><h3 className="font-display font-semibold text-navy">Support</h3><a href="tel:+919810080808" className="mt-4 flex items-center gap-3 text-xs font-semibold text-slate-600"><Phone size={16} className="text-brand"/> +91 98100 80808</a><a href="mailto:cargo@allianceaircargo.in" className="mt-3 flex items-center gap-3 text-xs font-semibold text-slate-600"><Mail size={16} className="text-brand"/> cargo@allianceaircargo.in</a></div></aside></div></div> }

function Portal({ user, onLogout, toast }) {
  const [route,setRoute]=useState(currentRoute()),[mobile,setMobile]=useState(false),[shipments,setShipments]=useState(()=>JSON.parse(localStorage.getItem('aac_shipments')||'null')||defaultShipments),[walletData,setWalletData]=useState(()=>JSON.parse(localStorage.getItem('aac_wallet')||'null')||defaultWallet)
  useEffect(()=>{const change=()=>setRoute(currentRoute());window.addEventListener('hashchange',change);if(!routeMap[currentRoute()])go('dashboard');return()=>window.removeEventListener('hashchange',change)},[])
  useEffect(()=>{api.get('/api/shipments').then(data=>{const rows=Array.isArray(data)?data:data?.shipments;if(rows?.length){setShipments(rows);localStorage.setItem('aac_shipments',JSON.stringify(rows))}}).catch(()=>{})},[])
  const refreshWallet=async(notify=false)=>{try{const data=await api.get('/api/wallet');if(data?.wallet){setWalletData(data);localStorage.setItem('aac_wallet',JSON.stringify(data));if(notify)toast('Wallet balance refreshed.')}}catch(error){if(notify)toast(error.message||'Wallet could not be refreshed.')}}
  useEffect(()=>{refreshWallet()},[])
  const onWalletChange=(wallet,transaction)=>setWalletData(current=>{const transactions=transaction?[transaction,...current.transactions.filter(item=>item.id!==transaction.id)]:current.transactions;const next={wallet,transactions};localStorage.setItem('aac_wallet',JSON.stringify(next));return next})
  const addShipment=s=>setShipments(current=>{const next=[s,...current];localStorage.setItem('aac_shipments',JSON.stringify(next));return next})
  let page=<Dashboard user={user} shipments={shipments} wallet={walletData.wallet}/>;if(route==='rates')page=<RateCalculator toast={toast}/>;if(route==='booking')page=<Booking addShipment={addShipment} toast={toast} wallet={walletData.wallet} onWalletChange={onWalletChange}/>;if(route==='shipments')page=<Shipments shipments={shipments}/>;if(route==='track')page=<Track shipments={shipments}/>;if(route==='wallet')page=<WalletPage data={walletData} onWalletChange={onWalletChange} onRefresh={()=>refreshWallet(true)} toast={toast}/>;if(route==='documents')page=<Documents toast={toast}/>;if(route==='profile')page=<Profile user={user} toast={toast}/>
  return <div className="min-h-screen bg-mist"><Sidebar route={route} mobile={mobile} setMobile={setMobile} onLogout={onLogout} user={user}/><PortalHeader route={route} setMobile={setMobile} user={user} wallet={walletData.wallet}/><main className="p-4 sm:p-7 lg:ml-[270px] lg:p-8 xl:p-10">{page}</main></div>
}

export default function App() {
  const [route,setRoute]=useState(currentRoute()),[user,setUser]=useState(()=>JSON.parse(localStorage.getItem('aac_session')||'null')),[toast,setToast]=useState('')
  useEffect(()=>{const change=()=>setRoute(currentRoute());window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[])
  useEffect(()=>{if(toast){const timer=setTimeout(()=>setToast(''),4200);return()=>clearTimeout(timer)}},[toast])
  const login=account=>{const destination=routeMap[route]?route:'dashboard';localStorage.setItem('aac_session',JSON.stringify(account));setUser(account);setToast('Signed in successfully.');go(destination)}
  const logout=()=>{api.post('/api/auth/logout',{}).catch(()=>{});localStorage.removeItem('aac_session');localStorage.removeItem('aac_wallet');setUser(null);go('login')}
  if(user)return <><Portal user={user} onLogout={logout} toast={setToast}/><Toast message={toast} onClose={()=>setToast('')}/></>
  let page=<Login onLogin={login} onForgot={()=>go('forgot-password')} onRegister={()=>go('register')} toast={setToast}/>
  if(route==='register')page=<Register onComplete={login} onBack={()=>go('login')} toast={setToast}/>
  if(route==='forgot-password')page=<ForgotPassword onBack={()=>go('login')} toast={setToast}/>
  return <>{page}<Toast message={toast} onClose={()=>setToast('')}/></>
}
