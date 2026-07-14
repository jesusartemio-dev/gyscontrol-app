'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Users, CalendarClock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { getJornadasEnCurso, type JornadaEnCurso } from '@/lib/services/registroHorasCampo'
import { getTarifasCampo } from '@/lib/services/tarifaCampo'
import { crearRequerimientoDelDia } from '@/lib/services/hojaDeGastos'

interface RequerimientoDelDiaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

interface PasajeEditable {
  usuarioId: string
  nombre: string
  monto: number
  sinTarifa: boolean
}

const formatDate = (date: string) => {
  const [year, month, day] = date.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

export function RequerimientoDelDiaModal({ open, onOpenChange, onCreated }: RequerimientoDelDiaModalProps) {
  const router = useRouter()
  const [paso, setPaso] = useState<'seleccion' | 'resumen'>('seleccion')
  const [loadingJornadas, setLoadingJornadas] = useState(false)
  const [loadingTarifas, setLoadingTarifas] = useState(false)
  const [jornadas, setJornadas] = useState<JornadaEnCurso[]>([])
  const [jornadaSel, setJornadaSel] = useState<JornadaEnCurso | null>(null)
  const [montoAlmuerzo, setMontoAlmuerzo] = useState(0)
  const [pasajes, setPasajes] = useState<PasajeEditable[]>([])
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (open) {
      setPaso('seleccion')
      setJornadaSel(null)
      loadJornadas()
    }
  }, [open])

  const loadJornadas = async () => {
    try {
      setLoadingJornadas(true)
      const data = await getJornadasEnCurso()
      setJornadas(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar jornadas en curso')
    } finally {
      setLoadingJornadas(false)
    }
  }

  const seleccionarJornada = async (jornada: JornadaEnCurso) => {
    if (!jornada.proyecto.clienteId) {
      toast.error('El proyecto de esta jornada no tiene cliente asignado, no se pueden resolver tarifas')
      return
    }
    setJornadaSel(jornada)
    try {
      setLoadingTarifas(true)
      const tarifas = await getTarifasCampo(jornada.proyecto.clienteId)
      const tarifasPorUsuario = new Map(tarifas.filter(t => t.activo).map(t => [t.userId, t]))

      let totalAlmuerzo = 0
      const pasajesResueltos: PasajeEditable[] = jornada.miembros.map(m => {
        const tarifa = tarifasPorUsuario.get(m.userId)
        totalAlmuerzo += tarifa?.costoAlmuerzo || 0
        return {
          usuarioId: m.userId,
          nombre: m.nombre || 'Sin nombre',
          monto: tarifa?.costoMovilidad || 0,
          sinTarifa: !tarifa,
        }
      })

      setMontoAlmuerzo(totalAlmuerzo)
      setPasajes(pasajesResueltos)
      setPaso('resumen')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar tarifas de campo')
      setJornadaSel(null)
    } finally {
      setLoadingTarifas(false)
    }
  }

  const actualizarPasaje = (usuarioId: string, monto: number) => {
    setPasajes(prev => prev.map(p => (p.usuarioId === usuarioId ? { ...p, monto } : p)))
  }

  const submit = async (confirmarDuplicado = false) => {
    if (!jornadaSel) return
    try {
      setCreando(true)
      const resultado = await crearRequerimientoDelDia({
        registroCampoId: jornadaSel.id,
        montoAlmuerzo,
        pasajes: pasajes.map(p => ({ usuarioId: p.usuarioId, nombre: p.nombre, monto: p.monto })),
        confirmarDuplicado,
      })

      if (!resultado.ok) {
        const confirmar = window.confirm(`${resultado.mensaje} ¿Deseas crear otro de todas formas?`)
        if (confirmar) {
          await submit(true)
        }
        return
      }

      toast.success(`Requerimiento ${resultado.hoja.numero} creado y enviado`)
      onOpenChange(false)
      onCreated()
      router.push(`/gastos/mis-requerimientos/${resultado.hoja.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear requerimiento del día')
    } finally {
      setCreando(false)
    }
  }

  const totalPasajes = pasajes.reduce((sum, p) => sum + (Number(p.monto) || 0), 0)
  const totalGeneral = montoAlmuerzo + totalPasajes

  return (
    <Dialog open={open} onOpenChange={(v) => !creando && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-600" />
            Requerimiento del día
          </DialogTitle>
          <DialogDescription>
            {paso === 'seleccion'
              ? 'Selecciona una jornada de campo en curso para generar el requerimiento de almuerzo y pasajes.'
              : 'Revisa y edita los montos antes de enviar el requerimiento.'}
          </DialogDescription>
        </DialogHeader>

        {paso === 'seleccion' && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {loadingJornadas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : jornadas.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No hay jornadas de campo en curso ahora mismo.
              </div>
            ) : (
              jornadas.map(j => (
                <button
                  key={j.id}
                  onClick={() => seleccionarJornada(j)}
                  disabled={loadingTarifas}
                  className="w-full text-left border rounded-md p-3 hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{j.proyecto.codigo} — {j.proyecto.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {j.proyecto.cliente?.nombre || 'Sin cliente'} · {formatDate(j.fechaTrabajo)}
                      </div>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                      <Users className="h-3 w-3" />
                      {j.cantidadMiembros}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {paso === 'resumen' && jornadaSel && (
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            <div className="text-sm text-muted-foreground">
              {jornadaSel.proyecto.codigo} — {jornadaSel.proyecto.nombre} · {jornadaSel.cantidadMiembros} personas
            </div>

            <div className="space-y-1.5">
              <Label>Almuerzo ({jornadaSel.cantidadMiembros} personas)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={montoAlmuerzo}
                onChange={(e) => setMontoAlmuerzo(Number(e.target.value))}
                disabled={creando}
              />
            </div>

            <div className="space-y-2">
              <Label>Pasajes por persona</Label>
              {pasajes.map(p => (
                <div key={p.usuarioId} className="flex items-center gap-2">
                  <div className="flex-1 text-sm truncate flex items-center gap-1.5">
                    {p.nombre}
                    {p.sinTarifa && (
                      <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        sin tarifa
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={p.monto}
                    onChange={(e) => actualizarPasaje(p.usuarioId, Number(e.target.value))}
                    className="w-28"
                    disabled={creando}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
              <span>Total</span>
              <span>S/ {totalGeneral.toFixed(2)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          {paso === 'resumen' && (
            <Button variant="outline" onClick={() => setPaso('seleccion')} disabled={creando}>
              Atrás
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creando}>
            Cancelar
          </Button>
          {paso === 'resumen' && (
            <Button onClick={() => submit(false)} disabled={creando} className="bg-amber-600 hover:bg-amber-700">
              {creando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Crear y enviar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
