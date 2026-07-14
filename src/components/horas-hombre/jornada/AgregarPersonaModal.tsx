'use client'

/**
 * AgregarPersonaModal - Agrega a alguien a la jornada sin pasar por "Agregar Tarea"
 * ni depender de que haya marcado asistencia (p. ej. no pudo marcar por problemas
 * de GPS/permisos en su celular). Queda con 0 horas en la tarea "Asistencia (auto)",
 * igual que si hubiera marcado ingreso por QR.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getUsuarios, type Usuario } from '@/lib/services/usuario'

interface AgregarPersonaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  onSuccess: () => void
}

export function AgregarPersonaModal({ open, onOpenChange, jornadaId, onSuccess }: AgregarPersonaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [usuarioId, setUsuarioId] = useState('')

  useEffect(() => {
    if (open) {
      setUsuarioId('')
      setBusqueda('')
      cargarUsuarios()
    }
  }, [open])

  const cargarUsuarios = async () => {
    try {
      setLoading(true)
      const data = await getUsuarios()
      setUsuarios(data)
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la lista de personal' })
    } finally {
      setLoading(false)
    }
  }

  const usuariosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return usuarios
    const term = busqueda.toLowerCase()
    return usuarios.filter(u => (u.name || u.email).toLowerCase().includes(term))
  }, [usuarios, busqueda])

  const handleSubmit = async () => {
    if (!usuarioId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona una persona' })
      return
    }
    try {
      setSubmitting(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/agregar-persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error agregando persona')

      toast({ title: 'Persona agregada', description: data.message })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error agregando persona',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-green-600" />
            Agregar persona a la jornada
          </DialogTitle>
          <DialogDescription>
            Para cuando alguien está presente pero no pudo marcar asistencia (por ejemplo,
            problemas de GPS o permisos en su celular). Queda registrada con 0 horas, editables
            después con el flujo normal de tareas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            disabled={loading}
          />
          <Select value={usuarioId} onValueChange={setUsuarioId} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? 'Cargando...' : 'Selecciona una persona'} />
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {usuariosFiltrados.length === 0 ? (
                <div className="px-2 py-2 text-xs text-gray-400 text-center">Sin resultados</div>
              ) : (
                usuariosFiltrados.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !usuarioId} className="bg-green-600 hover:bg-green-700">
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
