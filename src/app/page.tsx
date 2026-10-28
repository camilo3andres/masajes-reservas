'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  description: string
  price: number
  image_url?: string
}

type Testimonial = {
  id: string
  client_name: string
  message: string
  stars: number
  created_at: string
}

type Appointment = {
  id: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  services: { name: string } | null
}

type SlotInfo = {
  time: string
  status: 'available' | 'taken' | 'blocked'
}

type BookingStep = 1 | 2 | 3

const HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']

const STATUS_LABELS = {
  pending: 'Pendiente de confirmación',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
}

const STATUS_COLORS = {
  pending: 'bg-stone-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-600',
}

const GALLERY = [
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&q=80',
  'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&q=80',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80',
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&q=80',
]

const BUSINESS_PHONE = '3001234567'
const BUSINESS_EMAIL = 'contacto@florspa.example'
const BUSINESS_ADDRESS = 'Carrera 15 #93-20, Bogotá'
const MAPS_EMBED_URL = 'https://www.google.com/maps?q=Parque+de+la+93+Bogota+Colombia&output=embed'

function formatTime(t: string) {
  const [h] = t.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:00 ${period}`
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

const WA_ICON = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function Home() {
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])

  // Booking
  const [step, setStep] = useState<BookingStep>(1)
  const [selectedService, setSelectedService] = useState('')
  const [selectedServiceObj, setSelectedServiceObj] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [locationType, setLocationType] = useState<'spa' | 'domicilio' | ''>('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; submit?: string }>({})

  // Testimonials form
  const [tName, setTName] = useState('')
  const [tMessage, setTMessage] = useState('')
  const [tStars, setTStars] = useState(5)
  const [tLoading, setTLoading] = useState(false)
  const [tSuccess, setTSuccess] = useState(false)

  // Search
  const [searchPhone, setSearchPhone] = useState('')
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const bookingRef = useRef<HTMLElement>(null)
  const today = new Date().toISOString().split('T')[0]

  // Restaurar formulario desde localStorage al cargar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('booking_draft')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.step && d.step > 1) {
          setStep(d.step)
          if (d.selectedService) setSelectedService(d.selectedService)
          if (d.selectedServiceObj) setSelectedServiceObj(d.selectedServiceObj)
        }
        if (d.selectedDate && d.selectedDate >= today) setSelectedDate(d.selectedDate)
        if (d.selectedTime) setSelectedTime(d.selectedTime)
        if (d.clientName) setClientName(d.clientName)
        if (d.clientPhone) setClientPhone(d.clientPhone)
        if (d.locationType) setLocationType(d.locationType)
        if (d.address) setAddress(d.address)
      }
    } catch {}
  }, [])

  // Guardar formulario en localStorage cuando cambia algo
  useEffect(() => {
    if (!selectedService && !clientName && !selectedDate) return
    try {
      localStorage.setItem('booking_draft', JSON.stringify({
        step, selectedService, selectedServiceObj, selectedDate,
        selectedTime, clientName, clientPhone, locationType, address,
      }))
    } catch {}
  }, [step, selectedService, selectedServiceObj, selectedDate, selectedTime, clientName, clientPhone, locationType, address])

  useEffect(() => {
    setLoadingServices(true)
    supabase.from('services').select('*').eq('active', true)
      .then(({ data }) => { setServices(data ?? []); setLoadingServices(false) })
    supabase.from('testimonials').select('*').order('created_at', { ascending: false }).limit(9)
      .then(({ data }) => setTestimonials(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedDate) { setSlots([]); return }
    setSelectedTime('')
    setLoadingSlots(true)
    async function loadSlots() {
      const [{ data: blocked }, { data: booked }] = await Promise.all([
        supabase.from('availability').select('time').eq('date', selectedDate).eq('is_blocked', true),
        supabase.from('appointments').select('time').eq('date', selectedDate).in('status', ['pending', 'confirmed']),
      ])
      const blockedTimes = new Set((blocked ?? []).map((s: { time: string }) => s.time.slice(0, 5)))
      const bookedTimes = new Set((booked ?? []).map((a: { time: string }) => a.time.slice(0, 5)))
      setSlots(HOURS.map(h => ({
        time: h,
        status: blockedTimes.has(h) ? 'blocked' : bookedTimes.has(h) ? 'taken' : 'available',
      })))
      setLoadingSlots(false)
    }
    loadSlots()
  }, [selectedDate])

  function pickServiceFromCard(service: Service) {
    setSelectedService(service.id)
    setSelectedServiceObj(service)
    setStep(2)
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function resetBooking() {
    setSuccess(false)
    setStep(1)
    setSelectedService('')
    setSelectedServiceObj(null)
    setSelectedDate('')
    setSelectedTime('')
    setClientName('')
    setClientPhone('')
    setLocationType('')
    setAddress('')
    localStorage.removeItem('booking_draft')
    setSlots([])
    setFieldErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof fieldErrors = {}
    if (!clientName.trim()) errs.name = 'Ingresa tu nombre completo'
    if (clientPhone.replace(/\D/g, '').length < 10) errs.phone = 'Ingresa un número de WhatsApp válido (10 dígitos)'
    if (!locationType) errs.submit = 'Indica si el masaje es en el spa o a domicilio'
    if (locationType === 'domicilio' && !address.trim()) errs.submit = 'Ingresa tu dirección para el servicio a domicilio'
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    const { error: err } = await supabase.from('appointments').insert({
      service_id: selectedService,
      client_name: clientName,
      client_phone: clientPhone,
      date: selectedDate,
      time: selectedTime,
      status: 'pending',
      location_type: locationType,
      address: locationType === 'domicilio' ? address : null,
    })
    setLoading(false)
    if (err) {
      setFieldErrors({ submit: 'Ocurrió un error al agendar. Por favor intenta de nuevo.' })
    } else {
      setSuccess(true)
      const [y, m, d] = selectedDate.split('-')
      const locationLine = locationType === 'domicilio' ? `Lugar: A domicilio\nDirección: ${address}` : `Lugar: En el spa`
      const msg = `Hola Flor Spa! Acabo de agendar una cita.\n\nNombre: ${clientName}\nServicio: ${selectedServiceObj?.name}\nFecha: ${d}/${m}/${y}\nHora: ${formatTime(selectedTime)}\n${locationLine}\n\nQuedo pendiente de confirmación. ¡Gracias!`
      window.open(`https://wa.me/57${BUSINESS_PHONE}?text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  async function handleTestimonial(e: React.FormEvent) {
    e.preventDefault()
    if (!tName.trim() || !tMessage.trim()) return
    setTLoading(true)
    await supabase.from('testimonials').insert({ client_name: tName, message: tMessage, stars: tStars })
    const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false }).limit(9)
    setTestimonials(data ?? [])
    setTName(''); setTMessage(''); setTStars(5)
    setTLoading(false)
    setTSuccess(true)
    setTimeout(() => setTSuccess(false), 3000)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchPhone) return
    setSearching(true)
    setSearched(false)
    const { data } = await supabase
      .from('appointments').select('*, services(name)')
      .eq('client_phone', searchPhone).order('date', { ascending: false })
    setMyAppointments(data ?? [])
    setSearching(false)
    setSearched(true)
  }

  const availableCount = slots.filter(s => s.status === 'available').length

  // ── NAV scroll activo ───────────────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fdf6f0 0%, #f5e6d3 100%)' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-amber-800 mb-1">¡Cita agendada!</h2>
          <p className="text-stone-400 text-sm mb-5">Estamos listos para recibirte</p>

          <div className="bg-stone-50 rounded-2xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Servicio</span>
              <span className="font-semibold text-amber-700">{selectedServiceObj?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Fecha</span>
              <span className="font-semibold text-amber-700 capitalize">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Hora</span>
              <span className="font-semibold text-amber-700">{formatTime(selectedTime)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-stone-100">
              <span className="text-stone-400">Total</span>
              <span className="font-bold text-yellow-700">${selectedServiceObj?.price.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <div className="space-y-2 mb-6 text-left">
            {[
              { icon: '✅', text: 'Se abrió WhatsApp para confirmar tu cita' },
              { icon: '⏱️', text: 'Recibirás confirmación en menos de 1 hora' },
              ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-sm text-stone-500">
                <span className="shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={resetBooking} className="flex-1 bg-amber-700 text-white px-8 py-3 rounded-xl hover:bg-amber-800 transition font-medium">
              Agendar otra cita
            </button>
            <button
              onClick={() => { resetBooking(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex-1 flex items-center justify-center bg-amber-700 text-white px-8 py-3 rounded-xl hover:bg-amber-800 transition font-medium"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN PAGE ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fdf8f2 0%, #f5e9d6 100%)' }}>

      {/* Header con navegación */}
      <header className="bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🌸</span>
            <span className="font-bold text-amber-900 text-lg">Flor Spa Masajes</span>
          </div>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-500">
            <a href="#servicios" className="hover:text-amber-600 transition">Servicios</a>
            <a href="#nosotros" className="hover:text-amber-600 transition">Nosotros</a>
            <a href="#agendar" className="hover:text-amber-600 transition">Agenda</a>
            <a href="#contacto" className="hover:text-amber-600 transition">Contacto</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/57${BUSINESS_PHONE}?text=${encodeURIComponent('Hola Flor Spa Masajes! Me gustaría conocer más sobre sus servicios.')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-green-600 transition shrink-0"
            >
              {WA_ICON}
              <span className="hidden sm:inline">{BUSINESS_PHONE}</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>

            {/* Hamburguesa mobile */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-stone-100 transition"
              onClick={() => setMobileMenu(o => !o)}
              aria-label="Menú"
            >
              {mobileMenu ? (
                <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menú desplegable mobile */}
        {mobileMenu && (
          <div className="md:hidden border-t border-stone-100 bg-white px-4 py-3 flex flex-col gap-1">
            {[
              { href: '#servicios', label: 'Servicios' },
              { href: '#nosotros', label: 'Nosotros' },
              { href: '#agendar', label: 'Agenda tu cita' },
              { href: '#contacto', label: 'Contacto' },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenu(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-amber-50 hover:text-amber-800 transition"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: '400px' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=70')`, filter: 'brightness(0.38)' }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-28">
          <h1 className="animate-fade-in-up text-4xl sm:text-6xl font-bold text-white mb-4" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
            Flor Spa Masajes
          </h1>
          <p className="animate-fade-in-up delay-200 text-stone-300 text-lg max-w-md mb-8">
            Relájate, libera el estrés y renueva tu energía.
          </p>
          <a
            href="#agendar"
            className="animate-fade-in-up delay-300 bg-amber-600 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-amber-700 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform"
          >
            Agenda tu cita →
          </a>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60V30C360 0 1080 60 1440 30V60H0Z" fill="#fdf8f2" />
          </svg>
        </div>
      </div>


      {/* Barra de contacto rápido */}
      <div className="bg-amber-900 text-amber-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{BUSINESS_ADDRESS}</span>
          </div>
          <a href={`https://wa.me/57${BUSINESS_PHONE}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition">
            <svg className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{BUSINESS_PHONE}</span>
          </a>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Lun – Dom · 6:00 AM – 7:00 PM</span>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12 pb-24 md:pb-12 space-y-16">

        {/* ── SERVICIOS ── */}
        <section id="servicios">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-amber-900 mb-2">Nuestros servicios</h2>
            <p className="text-stone-400 text-sm">Sesiones de 1 hora · Haz clic en un servicio para reservar</p>
          </div>

          {loadingServices ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-50 animate-pulse">
                  <div className="h-44 bg-stone-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-stone-100 rounded w-2/3" />
                    <div className="h-3 bg-stone-100 rounded w-full" />
                    <div className="h-3 bg-stone-100 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-stone-300">
              <p className="text-4xl mb-3">🌸</p>
              <p>Pronto tendremos nuestros servicios disponibles.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {services.map(service => (
                <div
                  key={service.id}
                  onClick={() => pickServiceFromCard(service)}
                  className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-all duration-200 cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transform ${
                    selectedService === service.id
                      ? 'border-yellow-400 ring-2 ring-stone-300 shadow-md'
                      : 'border-stone-50 hover:border-stone-200'
                  }`}
                >
                  {service.image_url && (
                    <div className="h-44 overflow-hidden">
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-amber-800 text-lg">{service.name}</h3>
                      <span className="text-xs text-stone-400 bg-stone-100 px-2 py-1 rounded-full whitespace-nowrap shrink-0">60 min</span>
                    </div>
                    <p className="text-sm text-stone-400 leading-relaxed">{service.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-yellow-700 font-bold text-xl">${service.price.toLocaleString('es-CO')}</p>
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                        selectedService === service.id
                          ? 'bg-amber-700 text-white'
                          : 'bg-stone-50 text-amber-700 group-hover:bg-stone-100'
                      }`}>
                        {selectedService === service.id ? '✓ Seleccionado' : 'Reservar →'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── FORMULARIO / STEPPER ── */}
        <section id="agendar" ref={bookingRef} className="bg-white rounded-3xl shadow-sm border border-stone-50 overflow-hidden">

          {/* Header del stepper */}
          <div className="bg-gradient-to-r from-amber-800 to-amber-600 px-8 pt-8 pb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Agenda tu cita</h2>
            <p className="text-stone-100 text-sm mb-6">Sigue los 3 pasos para completar tu reserva</p>

            {/* Step indicator */}
            <div className="flex items-start gap-0">
              {([
                { n: 1, label: 'Servicio' },
                { n: 2, label: 'Fecha y hora' },
                { n: 3, label: 'Tus datos' },
              ] as { n: BookingStep; label: string }[]).map(({ n, label }, i) => (
                <div key={n} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => { if (step > n) setStep(n) }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        step > n
                          ? 'bg-white text-amber-700 cursor-pointer hover:scale-110'
                          : step === n
                            ? 'bg-white text-amber-700 ring-2 ring-white ring-offset-2 ring-offset-amber-700 cursor-default'
                            : 'bg-amber-700/50 text-stone-200 cursor-default'
                      }`}
                    >
                      {step > n ? '✓' : n}
                    </button>
                    <span className={`text-xs mt-1.5 font-medium text-center ${step >= n ? 'text-white' : 'text-stone-300'}`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-5 transition-all ${
                      step > n + 1 ? 'bg-white' : step > n ? 'bg-white/50' : 'bg-amber-700/40'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">

            {/* ── PASO 1: Servicio ── */}
            {step === 1 && (
              <div className="animate-fade-in">
                <h3 className="font-semibold text-amber-700 mb-1">¿Qué servicio deseas?</h3>
                <p className="text-stone-400 text-sm mb-4">También puedes hacer clic en las tarjetas de arriba</p>

                {loadingServices ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {services.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setSelectedService(s.id); setSelectedServiceObj(s) }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all text-left ${
                          selectedService === s.id
                            ? 'border-yellow-400 bg-stone-50'
                            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex-1 mr-3">
                          <p className={`font-medium text-sm ${selectedService === s.id ? 'text-amber-900' : 'text-amber-700'}`}>
                            {s.name}
                          </p>
                          {s.description && (
                            <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{s.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold text-yellow-700">${s.price.toLocaleString('es-CO')}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedService === s.id ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
                          }`}>
                            {selectedService === s.id && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedService}
                  className="mt-6 w-full bg-amber-700 text-white py-3.5 rounded-xl font-semibold hover:bg-amber-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar → Elegir fecha y hora
                </button>
              </div>
            )}

            {/* ── PASO 2: Fecha y hora ── */}
            {step === 2 && (
              <div className="animate-fade-in">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 transition mb-5"
                >
                  ← Volver al servicio
                </button>

                {/* Servicio seleccionado */}
                <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Servicio seleccionado</p>
                    <p className="font-semibold text-amber-700 text-sm">{selectedServiceObj?.name}</p>
                  </div>
                  <p className="text-yellow-700 font-bold">${selectedServiceObj?.price?.toLocaleString('es-CO') ?? '0'}</p>
                </div>

                <div className="space-y-6">
                  {/* Fecha */}
                  <div>
                    <label className="block text-sm font-semibold text-amber-600 mb-2">¿Qué día te queda bien?</label>
                    <input
                      type="date"
                      min={today}
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      onBlur={e => { if (e.target.value && e.target.value < today) setSelectedDate(today) }}
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-stone-50 text-amber-700"
                    />
                    <p className="text-xs text-stone-400 mt-1">Día / Mes / Año</p>
                  </div>

                  {/* Horarios */}
                  {selectedDate && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-amber-600">Elige tu hora</label>
                        {!loadingSlots && slots.length > 0 && (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            availableCount === 0 ? 'bg-red-100 text-red-600' :
                            availableCount <= 2 ? 'bg-stone-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {availableCount === 0
                              ? 'Sin disponibilidad'
                              : availableCount === 1
                                ? '¡Solo 1 espacio libre!'
                                : `${availableCount} espacios disponibles`}
                          </span>
                        )}
                      </div>

                      {loadingSlots ? (
                        <div className="grid grid-cols-3 gap-2">
                          {HOURS.map(h => (
                            <div key={h} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            {slots.map(slot => {
                              const isAvail = slot.status === 'available'
                              const isSelected = selectedTime === slot.time
                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  disabled={!isAvail}
                                  onClick={() => isAvail && setSelectedTime(slot.time)}
                                  className={`relative flex flex-col items-center justify-center py-3 rounded-xl text-sm font-medium border transition-all ${
                                    isSelected
                                      ? 'bg-amber-700 text-white border-amber-700 shadow-md scale-105'
                                      : isAvail
                                        ? 'bg-stone-50 border-stone-200 text-amber-700 hover:border-yellow-400 hover:bg-stone-50 hover:text-amber-800'
                                        : 'bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed'
                                  }`}
                                >
                                  <span>{formatTime(slot.time)}</span>
                                  <span className={`text-xs mt-0.5 font-normal ${
                                    isSelected ? 'text-stone-100' : isAvail ? 'text-stone-400' : 'text-stone-300'
                                  }`}>
                                    {isSelected ? 'Seleccionado ✓' : isAvail ? 'Disponible' : slot.status === 'taken' ? 'Ocupado' : 'No disp.'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>

                          {/* Leyenda */}
                          <div className="flex gap-5 mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-stone-400">
                              <div className="w-3 h-3 rounded-full bg-stone-50 border border-stone-200" />
                              Disponible
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-stone-400">
                              <div className="w-3 h-3 rounded-full bg-amber-600" />
                              Seleccionado
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-stone-400">
                              <div className="w-3 h-3 rounded-full bg-stone-100 border border-stone-100" />
                              Ocupado
                            </div>
                          </div>

                          {availableCount === 0 && (
                            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                              No hay horarios disponibles para esta fecha. Por favor elige otro día.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedDate || !selectedTime}
                  className="mt-6 w-full bg-amber-700 text-white py-3.5 rounded-xl font-semibold hover:bg-amber-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar → Mis datos
                </button>
              </div>
            )}

            {/* ── PASO 3: Datos de contacto ── */}
            {step === 3 && (
              <div className="animate-fade-in">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 transition mb-5"
                >
                  ← Volver a fecha y hora
                </button>

                {/* Resumen */}
                <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 mb-6">
                  <p className="text-xs text-stone-400 uppercase tracking-wide font-semibold mb-3">Resumen de tu cita</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400">Servicio</span>
                      <span className="font-medium text-amber-700">{selectedServiceObj?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400">Fecha</span>
                      <span className="font-medium text-amber-700 capitalize">{formatDate(selectedDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400">Hora</span>
                      <span className="font-medium text-amber-700">{formatTime(selectedTime)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-stone-100">
                      <span className="text-stone-500 font-medium">Total</span>
                      <span className="font-bold text-yellow-700 text-base">${selectedServiceObj?.price?.toLocaleString('es-CO') ?? '0'}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-amber-600 mb-1.5">Tu nombre completo</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => { setClientName(e.target.value); setFieldErrors(p => ({ ...p, name: undefined })) }}
                      placeholder="Ej: María García"
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-stone-50 text-amber-700 transition ${
                        fieldErrors.name ? 'border-red-300 focus:ring-red-200' : 'border-stone-200 focus:ring-stone-300'
                      }`}
                    />
                    {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-amber-600 mb-1.5">Número de WhatsApp</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={e => { setClientPhone(e.target.value); setFieldErrors(p => ({ ...p, phone: undefined })) }}
                      placeholder="3001234567"
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-stone-50 text-amber-700 transition ${
                        fieldErrors.phone ? 'border-red-300 focus:ring-red-200' : 'border-stone-200 focus:ring-stone-300'
                      }`}
                    />
                    {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
                    <p className="text-xs text-stone-400 mt-1">Te contactaremos aquí para confirmar tu cita</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-amber-600 mb-2">¿Dónde prefieres tu masaje?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setLocationType('spa')}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${locationType === 'spa' ? 'border-yellow-400 bg-stone-50 text-amber-900' : 'border-stone-200 text-amber-600 hover:border-stone-300'}`}
                      >
                        🏠 En el spa
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationType('domicilio')}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${locationType === 'domicilio' ? 'border-yellow-400 bg-stone-50 text-amber-900' : 'border-stone-200 text-amber-600 hover:border-stone-300'}`}
                      >
                        📍 A domicilio
                      </button>
                    </div>
                    {locationType === 'domicilio' && (
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Ingresa tu dirección completa"
                        className="mt-3 w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-stone-50 text-amber-700"
                      />
                    )}
                  </div>

                  <div className="hidden">{/* spacer */}
                  </div>

                  {fieldErrors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-red-600 text-sm">{fieldErrors.submit}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-amber-700 text-white py-4 rounded-xl font-semibold hover:bg-amber-800 transition-all disabled:opacity-50 shadow-md hover:shadow-lg text-base flex items-center justify-center gap-2"
                  >
                    {loading ? <><Spinner /> Agendando...</> : 'Confirmar cita 🌸'}
                  </button>

                  <p className="text-xs text-stone-400 text-center">
                    Al confirmar se abrirá WhatsApp para completar tu reserva con nosotros
                  </p>
                </form>
              </div>
            )}
          </div>
        </section>

        {/* ── CONSULTAR CITA ── */}
        <section className="bg-white rounded-3xl shadow-sm p-8 border border-stone-50">
          <h2 className="text-xl font-bold text-amber-900 mb-1">¿Ya tienes una cita?</h2>
          <p className="text-stone-400 text-sm mb-5">Consulta el estado con tu número de WhatsApp</p>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="tel"
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              placeholder="Tu número de WhatsApp"
              className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-stone-50 text-amber-700"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-amber-700 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-amber-800 transition disabled:opacity-50 flex items-center gap-2"
            >
              {searching ? <Spinner /> : 'Buscar'}
            </button>
          </form>

          {searched && (
            <div className="mt-4 space-y-3">
              {myAppointments.length === 0 ? (
                <p className="text-sm text-stone-400 bg-stone-50 rounded-xl px-4 py-3">
                  No encontramos citas con ese número.
                </p>
              ) : (
                myAppointments.map(a => (
                  <div key={a.id} className="border border-stone-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-amber-700 text-sm">{a.services?.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5 capitalize">
                          {formatDate(a.date)} · {formatTime(a.time)} · 60 min
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[a.status]}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </div>
                    {a.status !== 'cancelled' && (
                      <button
                        onClick={async () => {
                          await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', a.id)
                          setMyAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status: 'cancelled' } : x))
                          const [y, m, d] = a.date.split('-')
                          const msg = `Hola Flor Spa! Quiero cancelar mi cita.\n\nServicio: ${a.services?.name}\nFecha: ${d}/${m}/${y}\nHora: ${formatTime(a.time)}\n\nPor favor confirmame la cancelacion. Gracias!`
                          window.open(`https://wa.me/57${BUSINESS_PHONE}?text=${encodeURIComponent(msg)}`, '_blank')
                        }}
                        className="mt-2 text-xs text-red-400 hover:text-red-600 transition"
                      >
                        Cancelar cita
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* ── TESTIMONIOS ── */}
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-amber-900 mb-2">Lo que dicen nuestros clientes</h2>
            <p className="text-stone-400 text-sm">¿Ya nos visitaste? Déjanos tu reseña</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-50 mb-6">
            <h3 className="font-semibold text-amber-700 mb-4">Escribe tu reseña</h3>
            <form onSubmit={handleTestimonial} className="space-y-3">
              <input
                type="text"
                value={tName}
                onChange={e => setTName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-stone-50 text-amber-700"
              />
              <div>
                <p className="text-sm text-stone-500 mb-1.5">Calificación</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTStars(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${star <= tStars ? 'text-yellow-400' : 'text-stone-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={tMessage}
                onChange={e => setTMessage(e.target.value)}
                placeholder="¿Cómo fue tu experiencia?"
                rows={3}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-stone-50 text-amber-700 resize-none"
              />
              <button
                type="submit"
                disabled={tLoading}
                className="bg-amber-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-800 transition disabled:opacity-50 flex items-center gap-2"
              >
                {tLoading ? <><Spinner /> Enviando...</> : 'Enviar reseña'}
              </button>
              {tSuccess && <p className="text-green-600 text-sm">¡Gracias por tu reseña! 🌸</p>}
            </form>
          </div>

          {testimonials.length === 0 ? (
            <p className="text-center text-stone-300 text-sm">Sé el primero en dejar una reseña.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-3">
              {testimonials.map(t => (
                <div key={t.id} className="bg-white rounded-2xl shadow-sm p-6 border border-stone-50">
                  <div className="flex mb-3">
                    {[1, 2, 3, 4, 5].map(j => (
                      <span key={j} className={`text-sm ${j <= t.stars ? 'text-yellow-400' : 'text-stone-200'}`}>★</span>
                    ))}
                  </div>
                  <p className="text-stone-500 text-sm leading-relaxed mb-4">"{t.message}"</p>
                  <p className="text-amber-700 font-semibold text-sm">— {t.client_name}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SOBRE NOSOTROS ── */}
        <section id="nosotros">
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 sm:p-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-amber-900 mb-2">Sobre nosotros</h2>
              <div className="w-12 h-0.5 bg-amber-400 mx-auto" />
            </div>

            <div className="grid sm:grid-cols-3 gap-6 text-stone-500 text-sm leading-relaxed">
              <p>
                En Flor Spa Masajes nos dedicamos a brindarte un espacio de relajación donde puedas desconectarte del estrés y sentirte mejor contigo mismo. Nuestro objetivo es que cada sesión sea una experiencia tranquila, cómoda y realmente beneficiosa para tu cuerpo.
              </p>
              <p>
                Trabajamos con técnicas profesionales y una atención personalizada, adaptándonos a lo que cada persona necesita. Ya sea para aliviar tensiones, descansar o simplemente darte un momento para ti, estamos aquí para ayudarte.
              </p>
              <p>
                También ofrecemos servicio a domicilio, para que disfrutes de un buen masaje sin salir de casa y con toda la comodidad.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-stone-100 text-center">
              <p className="text-stone-600 font-medium text-sm italic">
                En Flor Spa Masajes queremos que te sientas bien, en calma y renovado.
              </p>
            </div>
          </div>
        </section>

        {/* ── POLÍTICA ── */}
        <section className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
          <h3 className="font-semibold text-amber-900 mb-3">Política de cancelación</h3>
          <ul className="text-sm text-stone-500 space-y-2">
            <li>• Para cancelar o reagendar contáctanos por WhatsApp</li>
            <li>• Para cancelar contáctanos por WhatsApp al <strong>{BUSINESS_PHONE}</strong></li>
          </ul>
        </section>

        {/* ── CONTACTO ── */}
        <section id="contacto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-amber-900 mb-2">Contáctanos</h2>
            <p className="text-stone-400 text-sm">Estamos aquí para atenderte</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-50 space-y-4">
              {[
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
                  label: 'Dirección',
                  content: BUSINESS_ADDRESS,
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
                  label: 'WhatsApp',
                  content: BUSINESS_PHONE,
                  href: `https://wa.me/57${BUSINESS_PHONE}`,
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
                  label: 'Correo',
                  content: BUSINESS_EMAIL,
                  href: `mailto:${BUSINESS_EMAIL}`,
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
                  label: 'Horario',
                  content: 'Lunes a Sábado · 9:00 AM – 6:00 PM',
                },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-stone-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-amber-700 text-sm mt-0.5 hover:underline">
                        {item.content}
                      </a>
                    ) : (
                      <p className="text-amber-700 text-sm mt-0.5">{item.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden shadow-sm border border-stone-50 min-h-64">
              <iframe
                src={MAPS_EMBED_URL}
                width="100%"
                height="100%"
                style={{ minHeight: '260px', border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

      </main>

      {/* WhatsApp FAB — solo desktop */}
      <a
        href={`https://wa.me/57${BUSINESS_PHONE}?text=${encodeURIComponent('Hola Flor Spa Masajes! Me gustaría conocer más sobre sus servicios.')}`}
        target="_blank" rel="noopener noreferrer"
        className="hidden md:flex fixed bottom-6 right-6 z-50 bg-green-500 text-white w-14 h-14 rounded-full shadow-lg items-center justify-center hover:bg-green-600 transition hover:scale-110"
        title="Escríbenos por WhatsApp"
      >
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      {/* Barra fija mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-100 px-4 py-3 flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <a
          href={`https://wa.me/57${BUSINESS_PHONE}?text=${encodeURIComponent('Hola Flor Spa Masajes! Me gustaría conocer más sobre sus servicios.')}`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-600 transition"
        >
          {WA_ICON}
          WhatsApp
        </a>
        <a
          href="#agendar"
          className="flex-1 flex items-center justify-center gap-2 bg-amber-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-amber-800 transition"
        >
          Agendar cita
        </a>
      </div>
      {/* Espaciado para que la barra mobile no tape el contenido */}
      <div className="md:hidden h-20" />

      {/* Footer completo */}
      <footer className="mt-4 bg-amber-900">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid gap-10 sm:grid-cols-3">

            {/* Col 1 — Marca */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🌸</span>
                <span className="font-bold text-white text-lg">Flor Spa Masajes</span>
              </div>
              <p className="text-amber-200 text-sm leading-relaxed">
                Bienestar, relajación y belleza para ti. Agenda tu cita y vive la experiencia.
              </p>
            </div>

            {/* Col 2 — Links rápidos */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Navegación</h4>
              <ul className="space-y-2 text-sm text-amber-200">
                <li><a href="#servicios" className="hover:text-white transition">Servicios</a></li>
                <li><a href="#nosotros" className="hover:text-white transition">Por qué elegirnos</a></li>
                <li><a href="#agendar" className="hover:text-white transition">Agendar cita</a></li>
                <li><a href="#contacto" className="hover:text-white transition">Contacto</a></li>
              </ul>
            </div>

            {/* Col 3 — Contacto */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Contacto</h4>
              <ul className="space-y-3 text-sm text-amber-200">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {BUSINESS_ADDRESS}
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`https://wa.me/57${BUSINESS_PHONE}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">{BUSINESS_PHONE}</a>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${BUSINESS_EMAIL}`} className="hover:text-white transition">{BUSINESS_EMAIL}</a>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Lun – Dom · 6:00 AM – 7:00 PM
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-amber-700 mt-10 pt-6 text-center text-xs text-amber-400">
            © {new Date().getFullYear()} Flor Spa Masajes · Bogotá, Colombia · Todos los derechos reservados
          </div>
        </div>
      </footer>

    </div>
  )
}
