'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowRight, Lock, ArrowDownCircle, ArrowUpCircle, Search, RefreshCw } from 'lucide-react'
import { getHojasDeGastos } from '@/lib/services/hojaDeGastos'
import type { HojaDeGastos } from '@/types'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function PendientesSaldoPage() {
  const router = useRouter()
  const [hojas, setHojas] = useState<HojaDeGastos[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      const data = await getHojasDeGastos({ estado: 'validado' })
      setHojas(data)
    } catch (e) {
      console.error('Error cargando hojas pendientes:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const hojasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return hojas
    const q = busqueda.toLowerCase()
    return hojas.filter(h =>
      h.numero.toLowerCase().includes(q) ||
      (h.empleado?.name?.toLowerCase() ?? '').includes(q) ||
      (h.proyecto?.codigo?.toLowerCase() ?? '').includes(q) ||
      (h.proyecto?.nombre?.toLowerCase() ?? '').includes(q)
    )
  }, [hojas, busqueda])

  const cuadradas = useMemo(() => hojasFiltradas.filter(h => Math.abs(h.saldo) <= 0.01), [hojasFiltradas])
  const debenDevolver = useMemo(
    () => hojasFiltradas.filter(h => h.saldo > 0.01).sort((a, b) => b.saldo - a.saldo),
    [hojasFiltradas]
  )
  const debenReembolsar = useMemo(
    () => hojasFiltradas.filter(h => h.saldo < -0.01).sort((a, b) => a.saldo - b.saldo),
    [hojasFiltradas]
  )

  const totalPorCobrar = debenDevolver.reduce((s, h) => s + h.saldo, 0)
  const totalPorPagar = debenReembolsar.reduce((s, h) => s + Math.abs(h.saldo), 0)

  const irADetalle = (id: string) => router.push(`/gastos/mis-requerimientos/${id}?from=administracion`)

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Pendientes de saldo</h1>
          <p className="text-xs text-muted-foreground">
            Hojas en estado <span className="font-medium">Validado</span> agrupadas por la acción de dinero pendiente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por REQ, empleado, proyecto..."
              className="h-8 pl-7 text-xs w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={cargar} disabled={loading} className="h-8">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-200">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-emerald-50"><Lock className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground">Listas para cerrar</p>
              <p className="text-lg font-bold text-emerald-700">{cuadradas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-50"><ArrowDownCircle className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground">Por cobrar (devoluciones)</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(totalPorCobrar)}</p>
              <p className="text-[10px] text-muted-foreground">{debenDevolver.length} hoja(s)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-50"><ArrowUpCircle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground">Por pagar (reembolsos)</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(totalPorPagar)}</p>
              <p className="text-[10px] text-muted-foreground">{debenReembolsar.length} hoja(s)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && hojas.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay hojas en estado validado. Todo al día. ✨
          </CardContent>
        </Card>
      )}

      {!loading && hojas.length > 0 && (
        <>
          {/* Sección 1: cuadradas */}
          <SeccionHojas
            titulo="Saldo S/ 0 — solo cerrar"
            hojas={cuadradas}
            color="emerald"
            icon={<Lock className="h-4 w-4" />}
            ctaLabel="Ir a cerrar"
            mostrarMonto={false}
            onClick={irADetalle}
          />

          {/* Sección 2: empleado debe devolver */}
          <SeccionHojas
            titulo="Empleado debe devolver"
            subtitulo="Saldo positivo: el empleado tiene dinero pendiente de devolver"
            hojas={debenDevolver}
            color="blue"
            icon={<ArrowDownCircle className="h-4 w-4" />}
            ctaLabel="Registrar devolución"
            mostrarMonto
            onClick={irADetalle}
          />

          {/* Sección 3: empresa debe reembolsar */}
          <SeccionHojas
            titulo="Empresa debe reembolsar"
            subtitulo="Saldo negativo: el empleado gastó más que el anticipo"
            hojas={debenReembolsar}
            color="amber"
            icon={<ArrowUpCircle className="h-4 w-4" />}
            ctaLabel="Registrar reembolso"
            mostrarMonto
            onClick={irADetalle}
          />
        </>
      )}
    </div>
  )
}

interface SeccionHojasProps {
  titulo: string
  subtitulo?: string
  hojas: HojaDeGastos[]
  color: 'emerald' | 'blue' | 'amber'
  icon: React.ReactNode
  ctaLabel: string
  mostrarMonto: boolean
  onClick: (id: string) => void
}

const colorClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700' },
}

function SeccionHojas({ titulo, subtitulo, hojas, color, icon, ctaLabel, mostrarMonto, onClick }: SeccionHojasProps) {
  const c = colorClasses[color]
  if (hojas.length === 0) return null

  return (
    <Card className={c.border}>
      <CardHeader className={`${c.bg} py-3 px-4`}>
        <CardTitle className={`text-sm flex items-center gap-2 ${c.text}`}>
          {icon}
          {titulo}
          <Badge className={`${c.badge} ml-1 text-[10px] px-1.5 py-0 border-0`}>{hojas.length}</Badge>
        </CardTitle>
        {subtitulo && <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">{subtitulo}</p>}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {hojas.map(h => (
            <button
              key={h.id}
              onClick={() => onClick(h.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
                <span className="col-span-3 sm:col-span-3 font-mono text-xs font-medium truncate">{h.numero}</span>
                <span className="col-span-5 sm:col-span-4 text-xs truncate">{h.empleado?.name ?? '—'}</span>
                <span className="hidden sm:block sm:col-span-3 text-[11px] text-muted-foreground truncate">
                  {h.proyecto ? `${h.proyecto.codigo}` : (h.centroCosto?.nombre ?? '—')}
                </span>
                {mostrarMonto ? (
                  <span className={`col-span-4 sm:col-span-2 text-right text-sm font-bold ${c.text}`}>
                    {formatCurrency(Math.abs(h.saldo))}
                  </span>
                ) : (
                  <span className="col-span-4 sm:col-span-2 text-right text-[11px] text-muted-foreground">
                    Validada {formatDate(h.fechaValidacion)}
                  </span>
                )}
              </div>
              <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] ${c.text} font-medium shrink-0`}>
                {ctaLabel}
                <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
