'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Appointment = {
  id: string
  client_name: string
  client_phone: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  services: { name: string } | null
  location_type: 'spa' | 'domicilio' | null
  address: string | null
}

type Testimonial = {
  id: string
  client_name: string
  message: string
  created_at: string
}

type Service = {
  id: string
  name: string
  description: string
  price: number
  active: boolean
}

const HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']

function formatTime(t: string) {
  const h = parseInt(t.slice(0, 2))
  const period = h < 12 ? 'AM' : 'PM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:00 ${period}`
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'appointments' | 'services' | 'availability' | 'testimonials'>('appointments')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [blockedSlots, setBlockedSlots] = useState<{ date: string; time: string }[]>([])
  const [allBlocked, setAllBlocked] = useState<{ date: string; time: string }[]>([])
  const [blockDate, setBlockDate] = useState('')

  // Filtros de citas
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all')
  const [filterDate, setFilterDate] = useState('')

  // Nuevo servicio
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [savingService, setSavingService] = useState(false)

  // Editar servicio
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPrice, setEditPrice] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/admin/login')
    })
  }, [router])

  useEffect(() => {
    loadAppointments()
    loadServices()
    loadTestimonials()
    loadAllBlocked()
  }, [])

  async function loadAllBlocked() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('availability').select('date, time')
      .eq('is_blocked', true)
      .gte('date', today)
      .order('date').order('time')
    setAllBlocked(data ?? [])
  }

  async function loadAppointments() {
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name)')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
    setAppointments(data ?? [])
  }

  async function loadTestimonials() {
    const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false })
    setTestimonials(data ?? [])
  }

  async function loadServices() {
    const { data } = await supabase.from('services').select('*').order('created_at')
    setServices(data ?? [])
  }

  async function loadBlocked() {
    if (!blockDate) return
    const { data } = await supabase
      .from('availability').select('date, time')
      .eq('date', blockDate).eq('is_blocked', true)
    setBlockedSlots(data ?? [])
  }

  useEffect(() => { loadBlocked() }, [blockDate])

  async function updateAppointmentStatus(id: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    loadAppointments()
    if (status === 'confirmed') {
      const appt = appointments.find(a => a.id === id)
      if (appt) {
        const dateStr = new Date(appt.date + 'T12:00:00').toLocaleDateString('es-CO', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
        const msg = `Hola ${appt.client_name}, te escribimos de Flor Spa Masajes.\n\nTu cita ha sido confirmada con los siguientes detalles:\n\nServicio: ${appt.services?.name}\nFecha: ${dateStr}\nHora: ${(() => { const h = parseInt(appt.time.slice(0, 2)); return `${h > 12 ? h - 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}` })()}\n\nTe esperamos. Si necesitas cancelar o reagendar, comunicate con nosotros.`
        window.open(`https://wa.me/57${appt.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
      }
    }
  }

  async function toggleBlock(time: string) {
    if (!blockDate) return
    const isBlocked = blockedSlots.some(s => s.time.slice(0, 5) === time)
    if (isBlocked) {
      await supabase.from('availability').delete().eq('date', blockDate).eq('time', time)
    } else {
      await supabase.from('availability').upsert({ date: blockDate, time, is_blocked: true })
    }
    loadBlocked()
    loadAllBlocked()
  }

  async function addService() {
    if (!newName || !newPrice) return
    setSavingService(true)
    await supabase.from('services').insert({ name: newName, description: newDesc, price: parseFloat(newPrice.replace(/\./g, '')), active: true })
    setNewName(''); setNewDesc(''); setNewPrice('')
    setSavingService(false)
    loadServices()
  }

  function startEdit(s: Service) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditDesc(s.description)
    setEditPrice(String(s.price))
  }

  async function saveEdit(id: string) {
    await supabase.from('services').update({ name: editName, description: editDesc, price: parseFloat(editPrice.replace(/\./g, '')) }).eq('id', id)
    setEditingId(null)
    loadServices()
  }

  async function toggleServiceActive(id: string, active: boolean) {
    await supabase.from('services').update({ active: !active }).eq('id', id)
    loadServices()
  }

  async function deleteService(id: string) {
    await supabase.from('services').delete().eq('id', id)
    loadServices()
  }

  async function deleteAppointment(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    loadAppointments()
  }

  async function deleteTestimonial(id: string) {
    await supabase.from('testimonials').delete().eq('id', id)
    loadTestimonials()
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Filtrar citas
  const filteredAppointments = appointments.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (filterDate && a.date !== filterDate) return false
    return true
  })

  // Resumen del día
  const todayAppointments = appointments.filter(a => a.date === today && a.status !== 'cancelled')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-rose-700">Panel de Administración</h1>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700">Ver sitio</a>
            <button onClick={logout} className="text-sm text-red-500 hover:text-red-700">Salir</button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          {(['appointments', 'services', 'availability', 'testimonials'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === t ? 'border-rose-600 text-rose-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'appointments' ? 'Citas' : t === 'services' ? 'Servicios' : t === 'availability' ? 'Disponibilidad' : 'Reseñas'}
            </button>
          ))}
        </div>

        {/* CITAS */}
        {tab === 'appointments' && (
          <div className="space-y-4">
            {/* Resumen del día */}
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-rose-700 mb-2">Hoy — {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-rose-400">No hay citas para hoy.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {todayAppointments.map(a => (
                    <span key={a.id} className="text-xs bg-white border border-rose-200 text-rose-700 px-3 py-1 rounded-full">
                      {formatTime(a.time)} · {a.client_name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400">Filtrar:</span>
              {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    filterStatus === s ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-200 text-gray-600 hover:border-rose-300'
                  }`}
                >
                  {s === 'all' ? 'Todas' : STATUS_LABELS[s]}
                </button>
              ))}
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-xs text-gray-400 hover:text-gray-600">× Limpiar fecha</button>
              )}
            </div>

            {filteredAppointments.length === 0 && (
              <p className="text-gray-400 text-sm">No hay citas con ese filtro.</p>
            )}
            {filteredAppointments.map(a => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{a.client_name}</p>
                  <p className="text-sm text-gray-500">{a.client_phone}</p>
                  <p className="text-sm text-gray-600 mt-1">{a.services?.name} — {new Date(a.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las {formatTime(a.time)}</p>
                  {a.location_type && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.location_type === 'domicilio' ? `📍 Domicilio — ${a.address}` : '🏠 En el spa'}
                    </p>
                  )}
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status !== 'confirmed' && (
                    <button onClick={() => updateAppointmentStatus(a.id, 'confirmed')} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition">Confirmar</button>
                  )}
                  {a.status !== 'cancelled' && (
                    <button onClick={() => updateAppointmentStatus(a.id, 'cancelled')} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">Cancelar</button>
                  )}
                  <a
                    href={`https://wa.me/57${a.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${a.client_name}, te escribimos de Flor Spa Masajes.\n\nTu cita de ${a.services?.name} esta programada para el ${new Date(a.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} a las ${formatTime(a.time)}.\n\nPor favor contactanos si necesitas algun cambio.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition"
                  >
                    WhatsApp
                  </a>
                  <button onClick={() => deleteAppointment(a.id)} className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 transition">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SERVICIOS */}
        {tab === 'services' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Agregar servicio</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <input placeholder="Nombre" value={newName} onChange={e => setNewName(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                <input placeholder="Descripción" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                <input placeholder="Precio" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              <button onClick={addService} disabled={savingService} className="mt-3 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-rose-700 transition disabled:opacity-50">
                {savingService ? 'Guardando...' : 'Agregar'}
              </button>
            </div>

            {services.map(s => (
              <div key={s.id} className="bg-white rounded-xl shadow-sm p-4">
                {editingId === s.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(s.id)} className="text-xs bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`font-semibold ${!s.active ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{s.name}</p>
                      <p className="text-sm text-gray-500">{s.description}</p>
                      <p className="text-sm text-rose-600 font-medium">${s.price.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => startEdit(s)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">Editar</button>
                      <button onClick={() => toggleServiceActive(s.id, s.active)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition">{s.active ? 'Desactivar' : 'Activar'}</button>
                      <button onClick={() => deleteService(s.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* RESEÑAS */}
        {tab === 'testimonials' && (
          <div className="space-y-3">
            {testimonials.length === 0 && <p className="text-gray-400 text-sm">No hay reseñas todavía.</p>}
            {testimonials.map(t => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{t.client_name}</p>
                  <p className="text-sm text-gray-500 mt-1">"{t.message}"</p>
                  <p className="text-xs text-gray-300 mt-1">{new Date(t.created_at).toLocaleDateString('es-CO')}</p>
                </div>
                <button onClick={() => deleteTestimonial(t.id)} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition shrink-0">Eliminar</button>
              </div>
            ))}
          </div>
        )}

        {/* DISPONIBILIDAD */}
        {tab === 'availability' && (
          <div className="space-y-5">

            {/* Resumen de bloqueos activos */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Horarios bloqueados actualmente</h3>
              {allBlocked.length === 0 ? (
                <p className="text-sm text-gray-400">No tienes ningún horario bloqueado.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(
                    allBlocked.reduce((acc, s) => {
                      acc[s.date] = acc[s.date] ? [...acc[s.date], s.time] : [s.time]
                      return acc
                    }, {} as Record<string, string[]>)
                  ).map(([date, times]) => (
                    <div key={date} className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 w-32 shrink-0 capitalize">
                        {new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {times.map(t => (
                          <span key={t} className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full border border-red-200">
                            🔒 {formatTime(t.slice(0, 5))}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloquear por fecha */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Bloquear / liberar horarios</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona una fecha</label>
              <input type="date" min={today} value={blockDate} onChange={e => setBlockDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            {blockDate && (
              <div className="flex flex-wrap gap-2">
                {HOURS.map(h => {
                  const blocked = blockedSlots.some(s => s.time.slice(0, 5) === h)
                  return (
                    <button key={h} onClick={() => toggleBlock(h)} className={`px-4 py-2 rounded-full text-sm border transition ${blocked ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}>
                      {formatTime(h)} {blocked ? '🔒' : '✓'}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4">Verde = disponible · Rojo = bloqueado. Haz clic para cambiar.</p>
          </div>
          </div>
        )}
      </div>
    </div>
  )
}
