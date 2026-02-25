'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, CheckCheck, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  tipo: 'info' | 'warning' | 'success' | 'error'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  leida: boolean
  accionUrl: string | null
  accionTexto: string | null
  createdAt: string
}

const TIPO_COLORS: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  error: 'bg-red-500',
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const dias = Math.floor(hrs / 24)
  if (dias < 7) return `${dias}d`
  return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

interface NotificacionesBellProps {
  collapsed?: boolean
}

export default function NotificacionesBell({ collapsed }: NotificacionesBellProps) {
  const { getBadgeCount, refreshCounts } = useNotifications()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  const noLeidas = getBadgeCount('notificaciones-no-leidas')

  const cargarNotificaciones = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notificaciones?limit=15')
      if (res.ok) {
        const data = await res.json()
        setNotificaciones(data.notificaciones || [])
        setTotal(data.total || 0)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) cargarNotificaciones()
  }, [open, cargarNotificaciones])

  const marcarLeida = async (id: string) => {
    try {
      await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
      refreshCounts()
    } catch { /* silent */ }
  }

  const marcarTodasLeidas = async () => {
    try {
      await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todas: true }),
      })
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
      refreshCounts()
    } catch { /* silent */ }
  }

  const limpiarLeidas = async () => {
    try {
      await fetch('/api/notificaciones', { method: 'DELETE' })
      setNotificaciones(prev => prev.filter(n => !n.leida))
      refreshCounts()
    } catch { /* silent */ }
  }

  const handleClick = (notif: Notificacion) => {
    if (!notif.leida) marcarLeida(notif.id)
    if (notif.accionUrl) {
      setOpen(false)
      router.push(notif.accionUrl)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={clsx(
            'relative text-gray-400 hover:text-white hover:bg-gray-700/50',
            collapsed ? 'w-full justify-center px-2' : 'px-2'
          )}
        >
          <Bell className="h-4 w-4" />
          {noLeidas > 0 && (
            <span className={clsx(
              'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1',
              noLeidas > 5 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
            )}>
              {noLeidas > 99 ? '99+' : noLeidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        className="w-[360px] p-0 max-h-[480px] flex flex-col"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h4 className="text-sm font-semibold">Notificaciones</h4>
          <div className="flex items-center gap-1">
            {noLeidas > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={marcarTodasLeidas}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Leer todas
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={limpiarLeidas}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Cargando...
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <span>Sin notificaciones</span>
            </div>
          ) : (
            notificaciones.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={clsx(
                  'flex items-start gap-2 px-3 py-2 border-b last:border-0 cursor-pointer transition-colors',
                  notif.leida ? 'bg-background hover:bg-muted/50' : 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/40'
                )}
              >
                <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', TIPO_COLORS[notif.tipo])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={clsx('text-xs font-medium truncate', !notif.leida && 'font-semibold')}>
                      {notif.titulo}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {tiempoRelativo(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.mensaje}</p>
                  {notif.accionUrl && (
                    <span className="text-[10px] text-blue-600 flex items-center gap-0.5 mt-0.5">
                      {notif.accionTexto || 'Ver'} <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                {!notif.leida && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); marcarLeida(notif.id) }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {total > 15 && (
          <div className="border-t px-3 py-1.5 text-center">
            <span className="text-[10px] text-muted-foreground">{total} notificaciones en total</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
