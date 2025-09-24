'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Link, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface DependencyCreatorProps {
  proyectoId: string
  cronogramaId?: string
  tasks: any[]
  onDependencyCreated?: () => void
}

export function DependencyCreator({ proyectoId, cronogramaId, tasks, onDependencyCreated }: DependencyCreatorProps) {
  const [open, setOpen] = useState(false)
  const [fromTaskId, setFromTaskId] = useState('')
  const [toTaskId, setToTaskId] = useState('')
  const [type, setType] = useState('finish_to_start')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!fromTaskId || !toTaskId) {
      toast.error('Selecciona ambas tareas')
      return
    }

    if (fromTaskId === toTaskId) {
      toast.error('No puedes crear dependencia de una tarea consigo misma')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromTaskId,
          toTaskId,
          type,
          cronogramaId
        })
      })

      if (response.ok) {
        toast.success('Dependencia creada exitosamente')
        setOpen(false)
        setFromTaskId('')
        setToTaskId('')
        onDependencyCreated?.()
      } else {
        toast.error('Error al crear dependencia')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const getTaskDisplayName = (task: any) => {
    const levelIcons = { 1: '📁', 2: '🔧', 3: '✅', 4: '📝' }
    const level = task.proyectoFaseId ? 2 : task.proyectoEdtId ? 3 : task.proyectoTareaId ? 4 : 1
    return `${levelIcons[level]} ${task.nombre}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="h-4 w-4 mr-2" />
          Crear Dependencia
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nueva Dependencia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tarea Predecesora (Origen)</label>
            <Select value={fromTaskId} onValueChange={setFromTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tarea origen" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {getTaskDisplayName(task)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Tipo de Dependencia</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="finish_to_start">Fin → Inicio (Más común)</SelectItem>
                <SelectItem value="start_to_start">Inicio → Inicio</SelectItem>
                <SelectItem value="finish_to_finish">Fin → Fin</SelectItem>
                <SelectItem value="start_to_finish">Inicio → Fin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Tarea Sucesora (Destino)</label>
            <Select value={toTaskId} onValueChange={setToTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tarea destino" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {getTaskDisplayName(task)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creando...' : 'Crear Dependencia'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}