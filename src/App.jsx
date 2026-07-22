import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Award, Box, Building2, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleCheck, Clock3, Globe2, Headphones, HeartPulse,
  Camera, LockKeyhole, Mail, MapPin, Menu, MessageCircle, PackageCheck,
  Phone, Plane, Search, Send, ShieldCheck, Snowflake, Sparkles, Star, Truck,
  Share2, Users, Warehouse, X, Zap,
} from 'lucide-react'
import { api } from './lib/api'

const CLIENT_PORTAL_URL = import.meta.env.VITE_CLIENT_PORTAL_URL || 'http://127.0.0.1:5174'
const portalLink = (route = 'login') => `${CLIENT_PORTAL_URL}/#/${route}`

const navItems = [
  ['Home', '#/home', 'home'], ['Services', '#/services', 'services'], ['Track', '#/track', 'track'],
  ['Schedule', '#/schedule', 'schedule'], ['About', '#/about', 'about'], ['Contact', '#/contact', 'contact'],
]

const services = [
  { icon: Plane, title: 'Express Air Freight', text: 'Priority uplift and time-definite delivery for urgent consignments across domestic and international routes.', tag: 'Fastest' },
  { icon: Box, title: 'General Cargo', text: 'Reliable airport-to-airport and door-to-door movement for everyday commercial shipments.', tag: 'Popular' },
  { icon: Snowflake, title: 'Temperature Controlled', text: 'Specialized cool-chain handling for pharma, perishables and sensitive healthcare cargo.', tag: '2–8°C' },
  { icon: Truck, title: 'Door-to-Door', text: 'One coordinated journey from pickup and clearance to final-mile delivery at destination.', tag: 'End-to-end' },
  { icon: ShieldCheck, title: 'Valuable & Secure', text: 'Controlled access, documented handling and enhanced monitoring for high-value shipments.', tag: 'Secure' },
  { icon: Warehouse, title: 'Customs & Warehousing', text: 'Documentation assistance, customs coordination and flexible short-term cargo storage.', tag: 'Simple' },
]

const testimonials = [
  { quote: 'Alliance Air Cargo has become our first call for critical automotive parts. Clear updates, quick uplift and a team that actually takes ownership.', name: 'Rohit Mehra', role: 'Supply Chain Head, Axis Components', initials: 'RM' },
  { quote: 'Their operations desk handled a time-sensitive pharma shipment with excellent attention to temperature and documentation. Completely dependable.', name: 'Dr. Neha Kapoor', role: 'Director, Mediline Exports', initials: 'NK' },
  { quote: 'From quote to delivery, everything was prompt and transparent. We now route our regular export cargo through their Delhi team.', name: 'Arjun Malhotra', role: 'Founder, Northstar Exports', initials: 'AM' },
]

const faqs = [
  ['How can I track my shipment?', 'Enter your AWB number in the shipment tracking box. Once the live backend is connected, you will see the current milestone, flight status and delivery updates in one place.'],
  ['What cargo can Alliance Air Cargo handle?', 'We support general cargo, express shipments, perishables, pharmaceuticals, valuable cargo, e-commerce and selected dangerous goods, subject to airline and regulatory acceptance.'],
  ['How is air freight cost calculated?', 'Pricing is generally based on the higher of actual weight and volumetric weight, along with route, service level, commodity and handling requirements.'],
  ['Do you provide door-to-door delivery?', 'Yes. We coordinate pickup, documentation, air movement, customs support and last-mile delivery across serviceable locations.'],
  ['How do I request a business rate?', 'Use the quote form or speak with our cargo desk. Share origin, destination, dimensions, weight and commodity for the most accurate proposal.'],
]

function Logo({ light = false }) {
  return (
    <a href="#/home" aria-label="Alliance Air Cargo home" className="group flex shrink-0 items-center gap-3">
      <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-brand text-white shadow-[0_8px_20px_rgba(15,98,254,.22)]">
        <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
          <path d="M8 30.5 24.7 12l15.6 3.6-14.8 6.6-5.4 12.9-3.8-8.9-8.3 4.3Z" fill="currentColor" />
          <path d="m18.8 24.9 7.1-2.9" stroke="#F4B400" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`font-display block text-[17px] font-bold tracking-[-.02em] ${light ? 'text-white' : 'text-navy'}`}>ALLIANCE</span>
        <span className={`mt-1 block text-[10px] font-bold tracking-[.22em] ${light ? 'text-blue-200' : 'text-brand'}`}>AIR CARGO</span>
      </span>
    </a>
  )
}

function SectionHeading({ eyebrow, title, text, center = false }) {
  return (
    <div className={`fade-up ${center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}`}>
      <div className={`mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-brand ${center ? 'justify-center' : ''}`}>
        <span className="h-px w-7 bg-gold" />{eyebrow}<span className={`h-px w-7 bg-gold ${center ? '' : 'hidden'}`} />
      </div>
      <h2 className="font-display text-3xl font-semibold leading-tight tracking-[-.035em] text-navy sm:text-4xl lg:text-[42px]">{title}</h2>
      {text && <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-base">{text}</p>}
    </div>
  )
}

function Header({ route }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    document.body.classList.toggle('menu-open', open)
    return () => document.body.classList.remove('menu-open')
  }, [open])

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="hidden bg-navy text-white lg:block">
          <div className="container-site flex h-9 items-center justify-between text-[11px] font-medium tracking-wide">
            <span className="flex items-center gap-2 text-blue-100"><Globe2 size={13} /> Connecting Indian businesses to the world</span>
            <div className="flex items-center gap-5">
              <a className="flex items-center gap-1.5 hover:text-gold" href="tel:+919810080808"><Phone size={12} /> +91 98100 80808</a>
              <a className="flex items-center gap-1.5 hover:text-gold" href="mailto:cargo@allianceaircargo.in"><Mail size={12} /> cargo@allianceaircargo.in</a>
              <span className="flex items-center gap-1.5"><Clock3 size={12} /> Mon–Sat · 09:00–19:00</span>
            </div>
          </div>
        </div>
        <div className="container-site flex h-[74px] items-center justify-between">
          <Logo />
          <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
            {navItems.map(([label, href, key]) => <a key={href} aria-current={route===key?'page':undefined} className={`relative py-2 text-[13px] font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:rounded-full after:bg-brand after:transition-transform ${route===key?'text-brand after:scale-x-100':'text-slate-600 after:scale-x-0 hover:text-brand hover:after:scale-x-100'}`} href={href}>{label}</a>)}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <a href={portalLink('login')} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-slate-100">Client Login</a>
            <a href="#/contact" className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(15,98,254,.2)] transition hover:bg-blue-700">Get a Quote <ArrowRight size={15} /></a>
          </div>
          <button onClick={() => setOpen(true)} aria-label="Open navigation menu" className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-navy lg:hidden"><Menu /></button>
        </div>
      </header>
      <div className={`fixed inset-0 z-[70] bg-navy/40 backdrop-blur-sm transition lg:hidden ${open ? 'visible opacity-100' : 'invisible opacity-0'}`} onClick={() => setOpen(false)}>
        <aside aria-label="Mobile navigation" onClick={e => e.stopPropagation()} className={`ml-auto flex h-full w-[min(88%,380px)] flex-col bg-white p-6 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between"><Logo /><button onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><X size={20} /></button></div>
          <nav className="mt-10 flex flex-col">
            {navItems.map(([label, href, key]) => <a key={href} aria-current={route===key?'page':undefined} onClick={() => setOpen(false)} href={href} className={`flex items-center justify-between border-b border-slate-100 py-4 font-semibold ${route===key?'text-brand':'text-navy'}`}>{label}<ChevronRight size={17} className="text-slate-400" /></a>)}
          </nav>
          <div className="mt-auto space-y-3">
            <a href="tel:+919810080808" className="flex items-center gap-3 rounded-xl bg-sky p-4 text-sm font-semibold text-navy"><Phone size={18} className="text-brand" /> +91 98100 80808</a>
            <a href={portalLink('login')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 px-5 py-3 font-semibold text-brand">Client Login</a>
            <a href="#/contact" onClick={() => setOpen(false)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 font-semibold text-white">Get a Quote <ArrowRight size={17} /></a>
          </div>
        </aside>
      </div>
    </>
  )
}

function Hero() {
  const [awb, setAwb] = useState('')
  const [notice, setNotice] = useState('')
  function track(e) {
    e.preventDefault()
    if (awb.trim().length < 6) return setNotice('Please enter a valid AWB or shipment number.')
    window.location.href = `${portalLink('track')}?awb=${encodeURIComponent(awb.trim())}`
  }
  return (
    <section id="home" className="relative overflow-hidden bg-[#f4f9fd] py-6 sm:py-9 lg:py-12">
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-100/55 blur-3xl" />
      <div className="container-site relative">
        <div className="grid overflow-hidden rounded-[30px] border border-blue-100 bg-white shadow-[0_28px_80px_rgba(18,53,91,.13)] lg:min-h-[630px] lg:grid-cols-[1.02fr_.98fr]">
          <div className="hero-in relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14 xl:px-16">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-sky px-4 py-2 text-[11px] font-bold tracking-wide text-navy"><CircleCheck size={15} className="text-brand" /> Trusted air cargo partner since 2010</div>
            <h1 className="font-display max-w-xl text-[2.55rem] font-semibold leading-[1.07] tracking-[-.05em] text-navy sm:text-[3.5rem] lg:text-[3.75rem] xl:text-[4.15rem]">Your cargo.<br />Our commitment.<br /><span className="text-brand">Delivered.</span></h1>
            <p className="mt-6 max-w-[540px] text-[15px] leading-7 text-slate-600 sm:text-base">Fast, secure and dependable air freight connections across India and the world—with one accountable team from booking to delivery.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href={portalLink('booking')} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(15,98,254,.2)] transition hover:-translate-y-0.5 hover:bg-blue-700">Book your cargo <ArrowRight size={16} /></a>
              <a href="#contact" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-navy transition hover:border-blue-200 hover:bg-sky"><Phone size={16} className="text-brand" /> Talk to our team</a>
            </div>
            <form onSubmit={track} className="mt-8 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_15px_40px_rgba(18,53,91,.09)] sm:flex sm:items-center">
              <div className="flex flex-1 items-center px-3 py-2 sm:py-0"><span className="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky text-brand"><Search size={18} /></span><label htmlFor="hero-awb" className="sr-only">AWB or shipment number</label><input id="hero-awb" value={awb} onChange={e => { setAwb(e.target.value); setNotice('') }} placeholder="Enter AWB / Shipment number" className="w-full bg-transparent py-2.5 text-sm text-navy outline-none placeholder:text-slate-400" /></div>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0b2948] sm:w-auto">Track now <ArrowRight size={16} /></button>
            </form>
            {notice && <p role="status" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{notice}</p>}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold text-slate-500">{['Priority uplift','Secure handling','Human support'].map(x => <span key={x} className="flex items-center gap-2"><Check size={14} className="text-green-600" />{x}</span>)}</div>
          </div>
          <div className="relative min-h-[420px] overflow-hidden sm:min-h-[510px] lg:min-h-full">
            <img src="/images/hero-modern-loading.jpg" srcSet="/images/hero-modern-loading-mobile.jpg 900w, /images/hero-modern-loading.jpg 1800w" sizes="(max-width: 767px) 100vw, 58vw" alt="Air cargo pallets being loaded onto a wide-body aircraft in daylight" width="1800" height="1350" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[58%_center]" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-transparent" />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/45 bg-white/90 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-navy shadow-lg backdrop-blur sm:left-7 sm:top-7"><span className="h-2 w-2 rounded-full bg-green-500" /> Live cargo operations</div>
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/45 bg-white/92 p-4 shadow-xl backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-auto sm:min-w-[300px] sm:p-5">
              <div className="flex items-center justify-between gap-5"><div><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Next priority uplift</span><strong className="font-display mt-1 block text-lg text-navy">DEL <span className="mx-1 text-blue-300">→</span> DXB</strong></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><Plane size={20} /></span></div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px]"><span className="text-slate-500">Today · 18:30</span><strong className="text-green-600">Space available</strong></div>
            </div>
          </div>
        </div>
        <div className="relative z-10 mx-3 -mt-1 grid grid-cols-2 overflow-hidden rounded-b-2xl border-x border-b border-blue-100 bg-white/95 shadow-lg backdrop-blur sm:mx-8 sm:grid-cols-4 lg:mx-14">
          {[['15+', 'Years of expertise'], ['42', 'Cities served'], ['24/7', 'Shipment support'], ['98.4%', 'On-time uplift']].map(([n,l]) => <div key={l} className="border-r border-t border-slate-100 px-3 py-4 text-center last:border-r-0 sm:border-t-0"><strong className="font-display text-xl text-navy sm:text-2xl">{n}</strong><span className="mt-1 block text-[9px] uppercase tracking-wider text-slate-400 sm:text-[10px]">{l}</span></div>)}
        </div>
      </div>
    </section>
  )
}

function Partners() {
  const brands = [
    { name: 'IndiGo CarGo', logo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/IndiGo_Airlines_logo.svg' },
    { name: 'Air India', logo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_India_2023.svg' },
    { name: 'Emirates SkyCargo', logo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Emirates_SkyCargo_Logo.svg', compact: true },
    { name: 'Qatar Airways Cargo', logo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Qatar_Airways_logo.svg' },
    { name: 'SpiceXpress', logo: '/images/partners/spicexpress.png', onDark: true },
    { name: 'Lufthansa Cargo', logo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Lufthansa_Cargo_Logo_2018.svg' },
  ]
  return (
    <section aria-label="Airline partners" className="overflow-hidden border-b border-slate-200 bg-white py-8">
      <div className="container-site mb-6 text-center text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Preferred capacity across leading airline partners</div>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="ticker flex w-max items-stretch" role="list">
          {[...brands, ...brands].map((brand, i) => (
            <figure key={`${brand.name}-${i}`} role="listitem" aria-hidden={i >= brands.length ? 'true' : undefined} className="mx-2 flex h-[76px] w-[168px] shrink-0 flex-col items-center justify-center rounded-xl border border-slate-100 bg-white px-5 shadow-[0_5px_18px_rgba(18,53,91,.05)] sm:mx-3 sm:h-[82px] sm:w-[190px]">
              <img
                src={brand.logo}
                alt={`${brand.name} logo`}
                width="150"
                height="42"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={event => { event.currentTarget.style.display = 'none' }}
                className={`${brand.onDark ? 'h-9 w-[138px] rounded-md bg-[#d71920] px-4 py-2' : brand.compact ? 'max-h-9 max-w-[54px]' : 'max-h-8 max-w-[132px] sm:max-w-[145px]'} object-contain`}
              />
              <figcaption className="mt-2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[.08em] text-slate-500">{brand.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function Services() {
  return (
    <section id="services" className="section-pad bg-mist">
      <div className="container-site">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="Our cargo solutions" title="Built around your shipment, not the other way around." text="From urgent documents to complex commercial freight, our specialists choose the right route, carrier and handling plan for every consignment." />
          <a href="#contact" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-brand hover:gap-3">Explore all services <ArrowRight size={17} /></a>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({icon: Icon, title, text, tag}, i) => <article key={title} className="fade-up card-lift group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7" style={{transitionDelay:`${i*55}ms`}}>
            <div className="mb-6 flex items-start justify-between"><span className="grid h-13 w-13 place-items-center rounded-xl bg-sky text-brand transition group-hover:bg-brand group-hover:text-white"><Icon size={25} /></span><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{tag}</span></div>
            <h3 className="font-display text-xl font-semibold text-navy">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
            <a href="#quote" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand">Request service <ChevronRight size={16} /></a>
          </article>)}
        </div>
      </div>
    </section>
  )
}

function Tracking() {
  const [tab, setTab] = useState('track')
  const [status, setStatus] = useState('')
  const submit = e => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (tab === 'track') window.location.href = `${portalLink('track')}?awb=${encodeURIComponent(data.get('awb') || '')}`
    else window.location.href = `${portalLink('rates')}?origin=${encodeURIComponent(data.get('origin') || '')}&destination=${encodeURIComponent(data.get('destination') || '')}`
  }
  return (
    <section id="tracking" className="section-pad bg-white">
      <div className="container-site grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
        <div className="fade-up relative">
          <div className="overflow-hidden rounded-[28px] shadow-soft"><img loading="lazy" decoding="async" width="1200" height="800" src="/images/warehouse-team.jpg" alt="Logistics employees handling shipments in an organized warehouse" className="h-[470px] w-full object-cover" /></div>
          <div className="absolute -bottom-6 -right-2 max-w-[250px] rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:right-[-24px]">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-green-50 text-green-600"><PackageCheck size={22}/></span><div><p className="text-xs text-slate-500">Shipment status</p><p className="font-display text-sm font-semibold text-navy">Arrived at hub</p></div></div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/4 rounded-full bg-brand" /></div>
            <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400"><span>DEL</span><span>In transit</span><span>BOM</span></div>
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="Complete visibility" title="Know where your cargo is. Every step of the way." text="One clear view of your shipment journey, backed by a responsive operations team when you need a human answer." />
          <div className="fade-up mt-8 rounded-2xl border border-slate-200 bg-white p-3 shadow-card sm:p-5">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Cargo search options">
              <button onClick={() => {setTab('track');setStatus('')}} role="tab" aria-selected={tab==='track'} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${tab==='track'?'bg-white text-brand shadow-sm':'text-slate-500'}`}>Track shipment</button>
              <button onClick={() => {setTab('schedule');setStatus('')}} role="tab" aria-selected={tab==='schedule'} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${tab==='schedule'?'bg-white text-brand shadow-sm':'text-slate-500'}`}>Flight schedule</button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              {tab === 'track' ? <div><label htmlFor="awb" className="mb-2 block text-xs font-bold uppercase tracking-wide text-navy">Air waybill number</label><div className="flex rounded-xl border border-slate-200 px-4 focus-within:border-brand focus-within:ring-2 focus-within:ring-blue-100"><input id="awb" name="awb" required placeholder="e.g. 125-98765432" className="w-full py-3.5 text-sm outline-none" /><Search className="my-auto text-slate-400" size={19}/></div></div> : <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wide text-navy">Origin<select name="origin" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-normal normal-case outline-none focus:border-brand"><option value="DEL">Delhi (DEL)</option><option value="BOM">Mumbai (BOM)</option><option value="BLR">Bengaluru (BLR)</option></select></label><label className="text-xs font-bold uppercase tracking-wide text-navy">Destination<select name="destination" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-normal normal-case outline-none focus:border-brand"><option value="DXB">Dubai (DXB)</option><option value="FRA">Frankfurt (FRA)</option><option value="SIN">Singapore (SIN)</option></select></label></div>}
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700">{tab==='track'?'Track now':'Find flights'} <ArrowRight size={16}/></button>
              {status && <p role="status" className="rounded-lg bg-sky p-3 text-xs leading-5 text-navy">{status}</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

function WhyUs() {
  const points = [
    [Zap, 'Faster decisions', 'Swift quotes and practical routing options from experienced cargo specialists.'],
    [ShieldCheck, 'Secure handling', 'Clear SOPs and dependable partners throughout the shipment lifecycle.'],
    [Headphones, 'Human support', 'A responsive operations desk—not a maze of automated replies.'],
    [Globe2, 'Connected network', 'Strong domestic reach with access to key international trade lanes.'],
  ]
  return (
    <section id="about" className="section-pad relative overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 opacity-25 dot-map" />
      <div className="container-site relative grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-20">
        <div className="fade-up"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-300"><span className="h-px w-7 bg-gold"/> Why Alliance</div><h2 className="font-display text-3xl font-semibold leading-tight tracking-[-.035em] sm:text-4xl lg:text-[42px]">Freight expertise you can count on.</h2><p className="mt-5 text-[15px] leading-7 text-blue-100/80">Air cargo runs on timing, accuracy and trust. We combine airline capacity, local operational knowledge and personal accountability to keep your supply chain moving.</p><div className="mt-8 flex items-center gap-5"><span className="grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10"><Award className="text-gold" size={30}/></span><div><strong className="font-display text-lg">IATA-aligned operations</strong><p className="mt-1 text-sm text-blue-200">Professional standards at every touchpoint</p></div></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {points.map(([Icon,title,text],i)=><div key={title} className="fade-up rounded-2xl border border-white/10 bg-white/[.07] p-6 backdrop-blur transition hover:bg-white/[.11]" style={{transitionDelay:`${i*70}ms`}}><Icon size={25} className="text-gold"/><h3 className="font-display mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-blue-100/75">{text}</p></div>)}
        </div>
      </div>
    </section>
  )
}

function Network() {
  const cities = [
    {name:'Delhi', x:28, y:38, main:true}, {name:'Mumbai', x:24, y:66, main:true}, {name:'Bengaluru', x:32, y:79}, {name:'Dubai', x:47, y:53, main:true},
    {name:'Frankfurt', x:45, y:27}, {name:'London', x:38, y:21}, {name:'Singapore', x:73, y:75, main:true}, {name:'Hong Kong', x:77, y:48},
  ]
  return (
    <section id="network" className="section-pad overflow-hidden bg-sky">
      <div className="container-site">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><SectionHeading eyebrow="Flight network" title="Well connected. Wherever business takes you." text="Flexible uplift through major Indian gateways and leading global cargo hubs." /><a href="#contact" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-brand">Request a route <ArrowRight size={17}/></a></div>
        <div className="fade-up relative mt-12 min-h-[430px] overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-soft">
          <div className="absolute inset-0 dot-map" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-70" aria-hidden="true">
            <path d="M28 38 Q38 28 45 27 M28 38 Q33 17 38 21 M28 38 Q36 50 47 53 M24 66 Q35 55 47 53 M32 79 Q53 87 73 75 M47 53 Q60 39 77 48 M47 53 Q62 61 73 75" fill="none" stroke="#0F62FE" strokeWidth=".42" className="route-line"/>
          </svg>
          <div className="absolute left-[8%] top-8 max-w-[240px] rounded-2xl bg-navy p-5 text-white shadow-xl sm:left-8"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300"><Plane size={15}/> Our reach</div><strong className="font-display mt-2 block text-3xl">42 cities</strong><span className="mt-1 block text-xs text-blue-100/70">Domestic & international coverage</span></div>
          {cities.map(c=><div key={c.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{left:`${c.x}%`,top:`${c.y}%`}}><span className={`relative block rounded-full ${c.main?'h-4 w-4 bg-brand':'h-3 w-3 bg-gold'} shadow-[0_0_0_6px_rgba(15,98,254,.12)]`} /><span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-navy shadow-sm">{c.name}</span></div>)}
          <Plane className="plane-float absolute left-[56%] top-[52%] rotate-45 text-brand" size={31} fill="#fff" />
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2 sm:bottom-7 sm:left-auto sm:right-7 sm:max-w-[390px] sm:justify-end">{['India','Middle East','Europe','Southeast Asia'].map(x=><span key={x} className="rounded-full border border-blue-100 bg-white/90 px-3 py-2 text-[11px] font-bold text-navy shadow-sm">{x}</span>)}</div>
        </div>
      </div>
    </section>
  )
}

function Fleet() {
  const specs = [['Payload', 'Up to 102 t'], ['Range', '8,200 km'], ['Main deck', '30 pallets'], ['Cargo door', '3.4 × 3.1 m']]
  return (
    <section className="section-pad bg-white">
      <div className="container-site grid overflow-hidden rounded-[28px] bg-mist lg:grid-cols-2">
        <div className="fade-up p-7 sm:p-12 lg:p-14"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-brand"><span className="h-px w-7 bg-gold"/> Capacity you can use</div><h2 className="font-display text-3xl font-semibold tracking-[-.035em] text-navy sm:text-4xl">The right aircraft for the job.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-slate-600">Access to dedicated freighter and belly capacity gives us flexibility across shipment sizes, timelines and destinations.</p><h3 className="font-display mt-8 text-xl font-semibold text-navy">Boeing 747-400F</h3><div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">{specs.map(([a,b])=><div key={a} className="bg-white p-4"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{a}</span><strong className="mt-1 block text-sm text-navy">{b}</strong></div>)}</div><p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><CircleCheck size={15} className="text-green-500"/> Oversized and special cargo capability available</p></div>
        <div className="relative min-h-[370px] overflow-hidden lg:min-h-full"><img loading="lazy" decoding="async" width="1024" height="1536" src="/images/cargo-747-alliance.jpg" alt="Alliance Air Cargo branded Boeing 747 freighter aircraft in flight" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-navy/55 via-transparent to-transparent"/><div className="absolute bottom-7 left-7 right-7 flex items-center justify-between text-white"><span className="text-xs font-semibold uppercase tracking-wider">Global freighter access</span><span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] backdrop-blur">Wide-body</span></div></div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="section-pad bg-mist">
      <div className="container-site"><SectionHeading center eyebrow="Customer stories" title="Trusted when timing matters most." text="Long-term relationships built through dependable delivery and clear communication."/>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">{testimonials.map((t,i)=><figure key={t.name} className="fade-up card-lift flex flex-col rounded-2xl border border-slate-200 bg-white p-7" style={{transitionDelay:`${i*70}ms`}}><div className="flex gap-1 text-gold" aria-label="5 out of 5 stars">{[1,2,3,4,5].map(x=><Star key={x} size={15} fill="currentColor"/>)}</div><blockquote className="mt-5 flex-1 text-[15px] leading-7 text-slate-600">“{t.quote}”</blockquote><figcaption className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-sky text-xs font-bold text-brand">{t.initials}</span><span><strong className="block text-sm text-navy">{t.name}</strong><span className="mt-1 block text-[11px] text-slate-500">{t.role}</span></span></figcaption></figure>)}</div>
      </div>
    </section>
  )
}

function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section className="section-pad bg-white">
      <div className="container-site grid gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-20">
        <div><SectionHeading eyebrow="Need to know" title="Frequently asked questions." text="Quick answers about booking, cargo acceptance, tracking and delivery."/><div className="fade-up mt-8 rounded-2xl bg-sky p-6"><MessageCircle className="text-brand"/><h3 className="font-display mt-4 text-lg font-semibold text-navy">Still have a question?</h3><p className="mt-2 text-sm leading-6 text-slate-600">Our cargo desk will help you find the right answer.</p><a href="#contact" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand">Contact support <ArrowRight size={16}/></a></div></div>
        <div className="fade-up divide-y divide-slate-200 border-y border-slate-200">{faqs.map(([q,a],i)=><div key={q}><button onClick={()=>setOpen(open===i?-1:i)} aria-expanded={open===i} className="flex w-full items-center justify-between gap-4 py-6 text-left"><span className="font-display text-[15px] font-semibold text-navy sm:text-base">{q}</span><ChevronDown size={19} className={`shrink-0 text-brand transition ${open===i?'rotate-180':''}`}/></button><div className={`grid transition-[grid-template-rows] duration-300 ${open===i?'grid-rows-[1fr]':'grid-rows-[0fr]'}`}><div className="overflow-hidden"><p className="pb-6 pr-8 text-sm leading-6 text-slate-600">{a}</p></div></div></div>)}</div>
      </div>
    </section>
  )
}

function QuoteContact() {
  const [sent, setSent] = useState(false)
  const submit = e => { e.preventDefault(); const request = Object.fromEntries(new FormData(e.currentTarget)); const saved = JSON.parse(localStorage.getItem('aac_quote_requests') || '[]'); localStorage.setItem('aac_quote_requests', JSON.stringify([{...request, createdAt: new Date().toISOString()}, ...saved])); api.post('/api/quotes', request).catch(() => {}); setSent(true); e.currentTarget.reset() }
  return (
    <section id="contact" className="section-pad bg-sky">
      <div id="quote" className="container-site grid overflow-hidden rounded-[28px] bg-white shadow-soft lg:grid-cols-[.92fr_1.08fr]">
        <div className="relative min-h-[420px] overflow-hidden p-8 text-white sm:p-12 lg:p-14">
          <img loading="lazy" decoding="async" width="1200" height="800" src="/images/warehouse-ops.jpg" alt="Cargo professionals coordinating warehouse operations" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-navy/90"/>
          <div className="relative"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-300"><span className="h-px w-7 bg-gold"/> Start a shipment</div><h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Let’s move your cargo.</h2><p className="mt-4 max-w-md text-sm leading-7 text-blue-100/80">Tell us the basics. A cargo specialist will review your requirement and respond with a practical routing and rate.</p><div className="mt-10 space-y-5"><a href="tel:+919810080808" className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Phone size={19} className="text-gold"/></span><span><small className="block text-[10px] uppercase tracking-wider text-blue-300">Cargo desk</small><strong className="mt-1 block text-sm">+91 98100 80808</strong></span></a><a href="mailto:cargo@allianceaircargo.in" className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Mail size={19} className="text-gold"/></span><span><small className="block text-[10px] uppercase tracking-wider text-blue-300">Email</small><strong className="mt-1 block text-sm">cargo@allianceaircargo.in</strong></span></a><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><MapPin size={19} className="text-gold"/></span><span><small className="block text-[10px] uppercase tracking-wider text-blue-300">Head office</small><strong className="mt-1 block text-sm">New Delhi, India</strong></span></div></div></div>
        </div>
        <form onSubmit={submit} className="p-7 sm:p-12 lg:p-14" aria-label="Request cargo quote">
          <h3 className="font-display text-2xl font-semibold text-navy">Request a quick quote</h3><p className="mt-2 text-sm text-slate-500">Fields marked * are required.</p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            {[['Full name *','name','text','Your name'],['Company','company','text','Company name'],['Work email *','email','email','you@company.com'],['Phone number *','phone','tel','+91 00000 00000']].map(([l,n,t,p])=><label key={l} className="text-xs font-bold text-navy">{l}<input name={n} required={l.includes('*')} type={t} placeholder={p} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-normal outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"/></label>)}
            <label className="text-xs font-bold text-navy">Origin *<input name="origin" required placeholder="City / airport" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"/></label><label className="text-xs font-bold text-navy">Destination *<input name="destination" required placeholder="City / airport" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"/></label>
          </div>
          <label className="mt-5 block text-xs font-bold text-navy">Shipment details<textarea name="details" rows="3" placeholder="Commodity, weight, dimensions and timeline" className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"/></label>
          <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-sm font-semibold text-white transition hover:bg-blue-700">Send quote request <Send size={16}/></button>
          {sent && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-medium text-green-700"><Check size={16}/> Quote form UI is ready. Submission will activate after backend integration.</p>}
          <p className="mt-4 flex items-start gap-2 text-[10px] leading-4 text-slate-400"><LockKeyhole size={13} className="mt-0.5 shrink-0"/> Your business information is treated as confidential and used only to respond to this request.</p>
        </form>
      </div>
    </section>
  )
}

function PageHero({ eyebrow, title, text, image, imageAlt, children }) {
  return (
    <section className="overflow-hidden bg-sky py-7 sm:py-10 lg:py-14">
      <div className="container-site grid overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-soft lg:min-h-[460px] lg:grid-cols-[.92fr_1.08fr]">
        <div className="flex flex-col justify-center p-7 sm:p-11 lg:p-14">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-brand"><span className="h-px w-7 bg-gold"/>{eyebrow}</div>
          <h1 className="font-display mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.045em] text-navy sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-600">{text}</p>
          {children&&<div className="mt-7 flex flex-wrap gap-3">{children}</div>}
        </div>
        <div className="relative min-h-[340px] lg:min-h-full">
          <img src={image} alt={imageAlt} width="1400" height="933" decoding="async" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-t from-navy/45 via-transparent to-transparent"/>
          <div className="absolute bottom-6 left-6 rounded-xl border border-white/30 bg-white/90 px-4 py-3 text-[11px] font-bold text-navy shadow-lg backdrop-blur"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500"/>Alliance operations network</div>
        </div>
      </div>
    </section>
  )
}

function PageCta({ title, text }) {
  return <section className="bg-white pb-16 sm:pb-20"><div className="container-site flex flex-col items-start justify-between gap-6 rounded-[26px] bg-navy p-7 text-white sm:p-10 lg:flex-row lg:items-center"><div><h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">{text}</p></div><div className="flex shrink-0 flex-wrap gap-3"><a href={portalLink('booking')} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold">Book cargo <ArrowRight size={16}/></a><a href="#/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-bold">Talk to us <Phone size={15}/></a></div></div></section>
}

function ServicesPage() {
  const steps = [['01','Share shipment details','Tell us the route, commodity, dimensions, weight and required delivery date.'],['02','Receive the right routing','Our cargo desk checks capacity, handling needs, cut-offs and practical alternatives.'],['03','Confirm and prepare','We coordinate booking, documentation, pickup and cargo acceptance.'],['04','Move with visibility','Milestone updates keep your team informed through uplift and delivery.']]
  return <><PageHero eyebrow="Cargo services" title="Air freight built around your shipment." text="From urgent documents to complex commercial cargo, Alliance combines airline access, careful handling and one accountable operations team." image="/images/warehouse-team.jpg" imageAlt="Cargo professionals preparing freight inside a logistics warehouse"><a href={portalLink('booking')} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white">Book a shipment <ArrowRight size={16}/></a><a href="#/contact" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-navy">Request pricing</a></PageHero><Services/><section className="section-pad bg-mist"><div className="container-site"><SectionHeading eyebrow="How it works" title="A clear process from enquiry to delivery." text="Simple hand-offs, practical communication and documented cargo handling at every important stage."/><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{steps.map(([n,t,d])=><article key={n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"><span className="font-display text-3xl font-semibold text-blue-200">{n}</span><h3 className="font-display mt-5 text-lg font-semibold text-navy">{t}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{d}</p></article>)}</div></div></section><Fleet/><PageCta title="Need a service matched to your cargo?" text="Speak with a cargo specialist for routing, acceptance and handling guidance before you book."/></>
}

function TrackPage() {
  const [awb,setAwb]=useState('125-98765432')
  const [lookedUp,setLookedUp]=useState(false)
  const milestones=[['Booking confirmed','Shipment details and space request accepted.'],['Cargo received','Freight checked at the origin cargo terminal.'],['Security & customs','Required screening and export formalities completed.'],['Flight departed','Cargo uplifted from Delhi on the booked routing.'],['Destination handling','Arrival, import processing and release coordination.']]
  const submit=e=>{e.preventDefault();if(awb.trim().length>=6)setLookedUp(true)}
  return <><PageHero eyebrow="Shipment visibility" title="Track air cargo with confidence." text="Follow the journey from booking and cargo acceptance through flight departure, arrival and final delivery coordination." image="/images/cargo-flight.jpg" imageAlt="Cargo aircraft flying on an international route"><a href="#page-track-form" onClick={e=>{e.preventDefault();document.getElementById('page-track-form')?.scrollIntoView({behavior:'smooth'})}} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white">Track an AWB <Search size={16}/></a><a href={portalLink('track')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-navy">Open client tracking</a></PageHero><section id="page-track-form" className="section-pad bg-white"><div className="container-site grid gap-8 lg:grid-cols-[.82fr_1.18fr]"><div><SectionHeading eyebrow="Live status" title="Enter your air waybill number." text="Use the complete AWB shown on your booking confirmation. Demo tracking is available with 125-98765432."/><div className="mt-7 rounded-2xl bg-sky p-5 text-sm leading-6 text-slate-600"><strong className="text-navy">Where to find your AWB</strong><p className="mt-2">Look at the booking confirmation, cargo receipt or shipment email. It normally appears as an airline prefix followed by eight digits.</p></div></div><div className="rounded-[26px] border border-slate-200 bg-mist p-5 shadow-card sm:p-8"><form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Air waybill number</span><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={19}/><input value={awb} onChange={e=>{setAwb(e.target.value);setLookedUp(false)}} className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100" placeholder="Enter AWB number" required/></label><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-4 text-sm font-bold text-white">Track shipment <ArrowRight size={16}/></button></form>{lookedUp?<div className="mt-6 rounded-2xl border border-green-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Air waybill</span><h2 className="font-display mt-1 text-2xl font-semibold text-navy">{awb}</h2></div><span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-brand">In transit</span></div><div className="mt-5 flex items-center justify-between rounded-xl bg-sky p-5"><strong className="font-display text-xl text-navy">DEL</strong><div className="flex flex-1 items-center px-4 text-brand"><span className="h-px flex-1 bg-blue-200"/><Plane className="mx-3"/><span className="h-px flex-1 bg-blue-200"/></div><strong className="font-display text-xl text-navy">DXB</strong></div><p className="mt-4 flex items-center gap-2 text-sm font-semibold text-green-700"><CircleCheck size={17}/> Flight departed origin hub · ETA 24 Jul, 14:30</p></div>:<div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-blue-200 bg-white p-9 text-center"><PackageCheck className="text-blue-200" size={42}/><p className="mt-3 text-sm text-slate-500">Your latest shipment milestone will appear here.</p></div>}</div></div></section><section className="section-pad bg-sky"><div className="container-site grid gap-10 lg:grid-cols-[1.1fr_.9fr]"><div><SectionHeading eyebrow="Cargo journey" title="Understand every tracking milestone." text="Operational milestones explain where your cargo is and what the next hand-off will be."/><div className="mt-9 space-y-3">{milestones.map(([title,text],i)=><div key={title} className="flex gap-4 rounded-2xl border border-blue-100 bg-white p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i+1}</span><div><h3 className="font-display font-semibold text-navy">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></div>)}</div></div><aside className="h-fit rounded-[26px] bg-navy p-7 text-white sm:p-9"><Headphones className="text-gold" size={30}/><h2 className="font-display mt-5 text-2xl font-semibold">Need an operational update?</h2><p className="mt-3 text-sm leading-7 text-blue-100/75">If a milestone has not changed or your cargo requires urgent attention, contact the operations desk with the AWB and destination.</p><a href="tel:+919810080808" className="mt-7 flex items-center gap-3 rounded-xl bg-white/10 p-4 text-sm font-bold"><Phone size={18} className="text-gold"/> +91 98100 80808</a><a href="mailto:cargo@allianceaircargo.in" className="mt-3 flex items-center gap-3 rounded-xl bg-white/10 p-4 text-sm font-bold"><Mail size={18} className="text-gold"/> cargo@allianceaircargo.in</a></aside></div></section><PageCta title="Ready to manage every shipment in one place?" text="Sign in to view bookings, shipment history, documents and detailed cargo milestones."/></>
}

function SchedulePage() {
  const flights=[['AAC 701','Delhi (DEL)','Dubai (DXB)','Daily','15:30','18:30'],['AAC 214','Mumbai (BOM)','Frankfurt (FRA)','Mon · Wed · Fri','17:00','21:10'],['AAC 508','Bengaluru (BLR)','Singapore (SIN)','Tue · Thu · Sat','21:30','01:45'],['AAC 119','Delhi (DEL)','London (LHR)','Mon · Thu · Sat','23:00','05:20']]
  return <><PageHero eyebrow="Flight schedule" title="Plan cargo around dependable uplift." text="Review indicative departures, cargo acceptance cut-offs and key connections across our priority network." image="/images/hero-cargo.jpg" imageAlt="Cargo aircraft positioned at an airport terminal"><a href={portalLink('booking')} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white">Check space <CalendarDays size={16}/></a><a href="#/contact" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-navy">Request a route</a></PageHero><section className="section-pad bg-white"><div className="container-site"><SectionHeading eyebrow="Priority departures" title="Indicative cargo flight schedule." text="Times are shown in local time and remain subject to aircraft, regulatory and capacity changes."/><div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-navy text-[10px] uppercase tracking-wider text-blue-100"><tr>{['Flight','Origin','Destination','Frequency','Cargo cut-off','Departure'].map(x=><th key={x} className="px-5 py-4">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{flights.map(row=><tr key={row[0]} className="text-sm hover:bg-sky"><td className="px-5 py-5 font-bold text-brand">{row[0]}</td>{row.slice(1).map((cell,i)=><td key={cell} className={`px-5 py-5 ${i===4?'font-bold text-navy':'text-slate-600'}`}>{cell}</td>)}</tr>)}</tbody></table></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3">{[[Clock3,'Cut-off guidance','Cargo should arrive before the published acceptance cut-off with documents ready.'],[ShieldCheck,'Acceptance checks','Final uplift depends on security, documentation, dimensions and airline approval.'],[Headphones,'Schedule support','Our team confirms the latest operating schedule before every booking.']].map(([Icon,t,d])=><article key={t} className="rounded-2xl bg-mist p-6"><Icon className="text-brand"/><h3 className="font-display mt-4 font-semibold text-navy">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{d}</p></article>)}</div></div></section><Network/><PageCta title="Need space on an upcoming departure?" text="Share your cargo dimensions, weight and preferred uplift date for a confirmed routing option."/></>
}

function AboutPage() {
  return <><PageHero eyebrow="About Alliance" title="Cargo expertise with personal accountability." text="Alliance Air Cargo supports businesses with reliable capacity, practical solutions and experienced people who stay close to every shipment." image="/images/warehouse-ops.jpg" imageAlt="Alliance cargo operations team coordinating warehouse activity"><a href="#/contact" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white">Meet our cargo desk <ArrowRight size={16}/></a></PageHero><section className="section-pad bg-white"><div className="container-site grid gap-10 lg:grid-cols-2 lg:items-center"><div className="overflow-hidden rounded-[26px] shadow-soft"><img loading="lazy" decoding="async" width="1200" height="800" src="/images/warehouse-team.jpg" alt="Professional cargo team working together" className="h-[460px] w-full object-cover"/></div><div><SectionHeading eyebrow="Our story" title="Built for businesses that cannot afford uncertainty." text="Since 2010, our focus has stayed simple: understand the cargo, choose a sensible routing and keep the customer informed."/><p className="mt-6 text-sm leading-7 text-slate-600">Our team brings together airline coordination, airport handling, customs support and surface logistics. That connected view helps us solve problems earlier and keep responsibility clear from enquiry to delivery.</p><div className="mt-8 grid grid-cols-2 gap-3">{[['15+','Years of expertise'],['42','Connected cities'],['24/7','Operational support'],['98.4%','On-time uplift']].map(([n,l])=><div key={l} className="rounded-xl bg-sky p-5"><strong className="font-display text-2xl text-navy">{n}</strong><span className="mt-1 block text-[11px] text-slate-500">{l}</span></div>)}</div></div></div></section><WhyUs/><section className="section-pad bg-white"><div className="container-site"><SectionHeading center eyebrow="Our principles" title="How we work, every day." text="The standards behind every customer conversation and operational decision."/><div className="mt-10 grid gap-5 md:grid-cols-3">{[[ShieldCheck,'Integrity','Clear commitments, transparent updates and responsible cargo handling.'],[Users,'Partnership','We work as an extension of customer supply-chain and operations teams.'],[Zap,'Responsiveness','Fast decisions and practical action when cargo plans change.']].map(([Icon,t,d])=><article key={t} className="rounded-2xl border border-slate-200 p-7 text-center shadow-card"><span className="mx-auto grid h-13 w-13 place-items-center rounded-xl bg-sky text-brand"><Icon/></span><h3 className="font-display mt-5 text-lg font-semibold text-navy">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{d}</p></article>)}</div></div></section><PageCta title="Put an experienced cargo team behind your next shipment." text="Tell us what you are moving and where it needs to go. We will help plan the next step."/></>
}

function ContactPage() {
  const offices=[['New Delhi','Cargo Terminal 2 · IGI Airport','+91 98100 80808'],['Mumbai','Air Cargo Complex · Sahar','+91 98100 80808'],['Bengaluru','Kempegowda Cargo Village','+91 98100 80808']]
  return <><PageHero eyebrow="Contact Alliance" title="Talk directly to a cargo specialist." text="Whether you need a quote, route guidance or an urgent operational update, our team will connect you with the right desk." image="/images/hero-modern-urban.jpg" imageAlt="International airport logistics and cargo connections"><a href="tel:+919810080808" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white"><Phone size={16}/> Call cargo desk</a><a href="mailto:cargo@allianceaircargo.in" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-navy"><Mail size={16}/> Send an email</a></PageHero><section className="section-pad bg-white"><div className="container-site"><SectionHeading eyebrow="Our offices" title="Local support at major cargo gateways." text="Contact the central cargo desk and we will coordinate with the closest operational station."/><div className="mt-10 grid gap-5 md:grid-cols-3">{offices.map(([city,address,phone])=><article key={city} className="rounded-2xl border border-slate-200 p-6 shadow-card"><MapPin className="text-brand"/><h3 className="font-display mt-5 text-xl font-semibold text-navy">{city}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{address}</p><a href={`tel:${phone.replace(/\s/g,'')}`} className="mt-5 block text-sm font-bold text-brand">{phone}</a><p className="mt-2 text-[11px] text-slate-400">Mon–Sat · 09:00–19:00</p></article>)}</div></div></section><QuoteContact/><FAQ/></>
}

function Footer() {
  return (
    <footer className="bg-[#0b2845] text-white">
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.8fr_1fr]">
        <div><Logo light/><p className="mt-5 max-w-xs text-sm leading-6 text-blue-100/65">Reliable air freight and logistics solutions, connecting Indian businesses to the world with speed and care.</p><div className="mt-6 flex gap-2">{[Share2,Users,Camera].map((Icon,i)=><a key={i} href="#" aria-label={['LinkedIn','Facebook','Instagram'][i]} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-blue-100 transition hover:bg-brand hover:text-white"><Icon size={16}/></a>)}</div></div>
        <div><h3 className="font-display text-sm font-semibold">Company</h3><ul className="mt-5 space-y-3 text-xs text-blue-100/65">{[['About us','#/about'],['Services','#/services'],['Schedule','#/schedule'],['Contact','#/contact']].map(([x,h])=><li key={x}><a href={h} className="hover:text-white">{x}</a></li>)}</ul></div>
        <div><h3 className="font-display text-sm font-semibold">Cargo tools</h3><ul className="mt-5 space-y-3 text-xs text-blue-100/65">{[['Track shipment',portalLink('track')],['Rate calculator',portalLink('rates')],['Book shipment',portalLink('booking')],['Client login',portalLink('login')]].map(([x,h])=><li key={x}><a href={h} className="hover:text-white">{x}</a></li>)}</ul></div>
        <div><h3 className="font-display text-sm font-semibold">Operations desk</h3><p className="mt-5 text-xs leading-6 text-blue-100/65">Monday–Saturday<br/>09:00–19:00 IST</p><a href="tel:+919810080808" className="mt-4 block text-sm font-semibold">+91 98100 80808</a><a href="mailto:cargo@allianceaircargo.in" className="mt-2 block text-xs text-blue-200">cargo@allianceaircargo.in</a></div>
      </div>
      <div className="border-t border-white/10"><div className="container-site flex flex-col gap-3 py-5 text-[10px] text-blue-100/50 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Alliance Air Cargo. All rights reserved.</p><div className="flex gap-5"><a href="#">Privacy policy</a><a href="#">Terms of service</a><a href="#">Sitemap</a></div></div></div>
    </footer>
  )
}

export default function App() {
  const readRoute=()=>{const route=window.location.hash.replace(/^#\/?/,'').split('?')[0];return ['services','track','schedule','about','contact'].includes(route)?route:'home'}
  const [route,setRoute]=useState(readRoute)
  useEffect(()=>{const change=()=>{setRoute(readRoute());window.scrollTo({top:0,behavior:'auto'})};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[])
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('is-visible')), { threshold: .12 })
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [route])
  let page=<><Hero/><Partners/><Services/><Tracking/><WhyUs/><Network/><Fleet/><Testimonials/><FAQ/><QuoteContact/></>
  if(route==='services')page=<ServicesPage/>
  if(route==='track')page=<TrackPage/>
  if(route==='schedule')page=<SchedulePage/>
  if(route==='about')page=<AboutPage/>
  if(route==='contact')page=<ContactPage/>
  return <><Header route={route}/><main id="main-content" className="site-pattern">{page}</main><Footer/><a href="https://wa.me/919810080808" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-5 right-5 z-40 grid h-13 w-13 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:-translate-y-1"><MessageCircle size={24} fill="currentColor"/></a></>
}
