'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Pencil, Loader2, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildApiUrl } from '@/lib/utils'
import type { Cotizacion } from '@/types'

interface Cliente {
  id: string
  nombre: string
}

interface User {
  id: string
  name: string
  email: string
}

interface Props {
  cotizacion: Cotizacion
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (cotizacion: Cotizacion) => void
}

export default function CotizacionEditModal({ cotizacion, open, onOpenChange, onUpdated }: Props) {
  const isLocked = cotizacion.estado === 'aprobada'
  const [nombre, setNombre] = useState(cotizacion.nombre)
  const [clienteId, setClienteId] = useState('')
  const [comercialId, setComercialId] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [comerciales, setComerciales] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (open) {
      setNombre(cotizacion.nombre)
      // Obtener IDs del cliente y comercial desde los objetos anidados
      // La API de lista usa 'user', la API de detalle usa 'comercial'
      const currentClienteId = cotizacion.cliente?.id || ''
      const currentComercialId = cotizacion.comercial?.id || (cotizacion as any).user?.id || ''
      setClienteId(currentClienteId)
      setComercialId(currentComercialId)
      loadData()
    }
  }, [open, cotizacion])

  const loadData = async () => {
    setLoadingData(true)
    try {
      const [clientesRes, usuariosRes] = await Promise.all([
        fetch(buildApiUrl('/api/clientes')),
        fetch(buildApiUrl('/api/admin/usuarios'))
      ])

      if (clientesRes.ok) {
        const clientesData = await clientesRes.json()
        setClientes(clientesData)
      }

      if (usuariosRes.ok) {
        const usuariosData = await usuariosRes.json()
        setComerciales(usuariosData)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setLoading(true)
    try {
      // Construir payload para la API (usando nombres de campos de Prisma)
      const payload: Record<string, string | null> = {
        nombre: nombre.trim(),
      }
      // Solo enviar clienteId/comercialId si tienen valor
      if (clienteId) payload.clienteId = clienteId
      if (comercialId) payload.comercialId = comercialId

      const res = await fetch(buildApiUrl(`/api/cotizacion/${cotizacion.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Error al actualizar cotización')

      // Recargar la cotización completa para obtener los datos formateados
      const reloadRes = await fetch(buildApiUrl(`/api/cotizacion/${cotizacion.id}`))
      if (!reloadRes.ok) throw new Error('Error al recargar cotización')
      const updated = await reloadRes.json()

      toast.success('Cotización actualizada')
      onUpdated(updated)
      onOpenChange(false)
    } catch (err) {
      console.error('Error updating cotización:', err)
      toast.error('Error al actualizar cotización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Editar Cotización
          </DialogTitle>
        </DialogHeader>

        {isLocked && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            Esta cotización está aprobada y no puede ser editada.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="text-xs">Nombre *</Label>
            <Textarea
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la cotización"
              rows={4}
              className="resize-none"
              disabled={loading || isLocked}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cliente" className="text-xs">
              Cliente
              {cotizacion.cliente?.nombre && (
                <span className="ml-2 text-muted-foreground font-normal">
                  (actual: {cotizacion.cliente.nombre})
                </span>
              )}
            </Label>
            <Select
              value={clienteId}
              onValueChange={setClienteId}
              disabled={loading || loadingData || isLocked}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={loadingData ? 'Cargando...' : 'Seleccionar cliente'}>
                  {clientes.find(c => c.id === clienteId)?.nombre ||
                   cotizacion.cliente?.nombre ||
                   'Seleccionar cliente'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comercial" className="text-xs">
              Comercial
              {(cotizacion as any).user?.name && (
                <span className="ml-2 text-muted-foreground font-normal">
                  (actual: {(cotizacion as any).user.name})
                </span>
              )}
            </Label>
            <Select
              value={comercialId}
              onValueChange={setComercialId}
              disabled={loading || loadingData || isLocked}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={loadingData ? 'Cargando...' : 'Seleccionar comercial'}>
                  {comerciales.find(u => u.id === comercialId)?.name ||
                   (cotizacion as any).user?.name ||
                   'Seleccionar comercial'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {comerciales.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || isLocked}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
