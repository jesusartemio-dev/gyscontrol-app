'use client'

/**
 * SeleccionCuadrilla - Componente para seleccionar múltiples usuarios de un proyecto
 *
 * Permite seleccionar miembros de la cuadrilla con checkbox,
 * mostrando nombre, rol y email de cada usuario.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Users, User } from 'lucide-react'

interface Usuario {
  id: string
  name: string | null
  email: string
  role: string
}

interface PersonalProyecto {
  id: string
  userId: string
  rol: string
  user: Usuario
}

interface SeleccionCuadrillaProps {
  proyectoId: string
  seleccionados: string[] // Lista de userIds seleccionados
  onChange: (seleccionados: string[]) => void
  disabled?: boolean
}

export function SeleccionCuadrilla({
  proyectoId,
  seleccionados,
  onChange,
  disabled = false
}: SeleccionCuadrillaProps) {
  const [personal, setPersonal] = useState<PersonalProyecto[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  // Cargar personal del proyecto
  useEffect(() => {
    if (proyectoId) {
      cargarPersonal()
    } else {
      setPersonal([])
    }
  }, [proyectoId])

  const cargarPersonal = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/proyecto/${proyectoId}/personal`)

      if (!response.ok) throw new Error('Error cargando personal')

      const data = await response.json()

      if (data.success) {
        // Combinar roles fijos y personal dinámico
        const personalDinamico = data.data.personalDinamico || []
        const rolesFijos = data.data.rolesFijos || {}

        // Convertir roles fijos a formato de personal
        const rolesComoPersonal: PersonalProyecto[] = []
        if (rolesFijos.gestor) {
          rolesComoPersonal.push({
            id: `fijo-gestor-${rolesFijos.gestor.id}`,
            userId: rolesFijos.gestor.id,
            rol: 'gestor',
            user: rolesFijos.gestor
          })
        }
        if (rolesFijos.supervisor) {
          rolesComoPersonal.push({
            id: `fijo-supervisor-${rolesFijos.supervisor.id}`,
            userId: rolesFijos.supervisor.id,
            rol: 'supervisor',
            user: rolesFijos.supervisor
          })
        }
        if (rolesFijos.lider) {
          rolesComoPersonal.push({
            id: `fijo-lider-${rolesFijos.lider.id}`,
            userId: rolesFijos.lider.id,
            rol: 'lider',
            user: rolesFijos.lider
          })
        }

        // Combinar y eliminar duplicados por userId
        const todosPersonal = [...rolesComoPersonal, ...personalDinamico]
        const personalUnico = todosPersonal.filter(
          (p, index, self) => index === self.findIndex(t => t.userId === p.userId)
        )

        setPersonal(personalUnico)
      }
    } catch (error) {
      console.error('Error cargando personal:', error)
      setPersonal([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (userId: string) => {
    if (disabled) return

    if (seleccionados.includes(userId)) {
      onChange(seleccionados.filter(id => id !== userId))
    } else {
      onChange([...seleccionados, userId])
    }
  }

  const handleSelectAll = () => {
    if (disabled) return

    const filtrados = personalFiltrado.map(p => p.userId)
    const todosSeleccionados = filtrados.every(id => seleccionados.includes(id))

    if (todosSeleccionados) {
      // Deseleccionar todos los filtrados
      onChange(seleccionados.filter(id => !filtrados.includes(id)))
    } else {
      // Seleccionar todos los filtrados
      const nuevosSeleccionados = [...new Set([...seleccionados, ...filtrados])]
      onChange(nuevosSeleccionados)
    }
  }

  // Filtrar por búsqueda
  const personalFiltrado = personal.filter(p => {
    const busquedaLower = busqueda.toLowerCase()
    return (
      (p.user.name?.toLowerCase().includes(busquedaLower) || false) ||
      p.user.email.toLowerCase().includes(busquedaLower) ||
      p.rol.toLowerCase().includes(busquedaLower)
    )
  })

  const todosSeleccionados = personalFiltrado.length > 0 &&
    personalFiltrado.every(p => seleccionados.includes(p.userId))

  const getRolColor = (rol: string) => {
    const colores: Record<string, string> = {
      gestor: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-blue-100 text-blue-800',
      lider: 'bg-green-100 text-green-800',
      coordinador: 'bg-orange-100 text-orange-800',
      tecnico: 'bg-cyan-100 text-cyan-800',
      ingeniero: 'bg-indigo-100 text-indigo-800',
      programador: 'bg-pink-100 text-pink-800',
      cadista: 'bg-yellow-100 text-yellow-800',
      asistente: 'bg-gray-100 text-gray-800'
    }
    return colores[rol] || 'bg-gray-100 text-gray-800'
  }

  if (!proyectoId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>Seleccione un proyecto primero</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando personal del proyecto...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Búsqueda y seleccionar todos */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email o rol..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={todosSeleccionados}
            onCheckedChange={handleSelectAll}
            disabled={disabled || personalFiltrado.length === 0}
          />
          <label htmlFor="select-all" className="text-sm text-gray-600 cursor-pointer">
            Todos ({personalFiltrado.length})
          </label>
        </div>
      </div>

      {/* Contador de seleccionados */}
      {seleccionados.length > 0 && (
        <div className="text-sm text-blue-600 font-medium">
          {seleccionados.length} persona(s) seleccionada(s)
        </div>
      )}

      {/* Lista de personal */}
      <Card>
        <CardContent className="p-2 max-h-[300px] overflow-y-auto">
          {personalFiltrado.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No hay personal disponible</p>
            </div>
          ) : (
            <div className="space-y-1">
              {personalFiltrado.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    seleccionados.includes(p.userId)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={() => handleToggle(p.userId)}
                >
                  <Checkbox
                    checked={seleccionados.includes(p.userId)}
                    onCheckedChange={() => handleToggle(p.userId)}
                    disabled={disabled}
                  />
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {p.user.name || p.user.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{p.user.email}</p>
                  </div>
                  <Badge className={getRolColor(p.rol)} variant="secondary">
                    {p.rol}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SeleccionCuadrilla
