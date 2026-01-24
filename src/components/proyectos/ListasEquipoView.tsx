// ===================================================
// 📁 Archivo: ListasEquipoView.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Componente para mostrar todas las listas de equipos con filtros
// 🧠 Uso: Vista consolidada con filtros por proyecto y estado
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, Filter, Eye, Plus, Calendar, Package, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ListaEquipo, EstadoListaEquipo } from '@/types'

// ✅ Service function to fetch all listas
async function fetchListasEquipo(proyectoId?: string, estado?: EstadoListaEquipo | 'todos' | 'all'): Promise<ListaEquipo[]> {
  try {
    const params = new URLSearchParams()
    if (proyectoId && proyectoId !== 'todos') params.append('proyectoId', proyectoId)
    if (estado && estado !== 'todos' && estado !== 'all') params.append('estado', estado)

    const url = `/api/listas-equipo${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error('Error al obtener listas de equipos')
    }

    const result = await response.json()
    // ✅ Handle paginated response - extract data array
    return result.data || result || []
  } catch (error) {
    console.error('❌ Error fetching listas:', error)
    toast.error('Error al cargar las listas de equipos')
    return []
  }
}

// ✅ Service function to fetch projects for filter
async function fetchProyectos() {
  try {
    const response = await fetch('/api/proyecto', { cache: 'no-store' })
    if (!response.ok) throw new Error('Error al obtener proyectos')
    return await response.json()
  } catch (error) {
    console.error('❌ Error fetching proyectos:', error)
    return []
  }
}

// ✅ Estado badge mapping - aligned with EstadoListaEquipo enum
const estadoBadgeVariant: Record<EstadoListaEquipo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  borrador: 'secondary',
  enviada: 'outline',
  por_revisar: 'default',
  por_cotizar: 'default',
  por_validar: 'default',
  por_aprobar: 'default',
  aprobada: 'default',
  rechazada: 'destructive',
  completada: 'default'
}

const estadoColors: Record<EstadoListaEquipo, string> = {
  borrador: 'bg-gray-100 text-gray-800',
  enviada: 'bg-indigo-100 text-indigo-800',
  por_revisar: 'bg-yellow-100 text-yellow-800',
  por_cotizar: 'bg-blue-100 text-blue-800',
  por_validar: 'bg-orange-100 text-orange-800',
  por_aprobar: 'bg-purple-100 text-purple-800',
  aprobada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
  completada: 'bg-emerald-100 text-emerald-800'
}

export function ListasEquipoView() {
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProyecto, setSelectedProyecto] = useState<string>('todos')
  const [selectedEstado, setSelectedEstado] = useState<string>('todos')

  // ✅ Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [listasData, proyectosData] = await Promise.all([
          fetchListasEquipo(),
          fetchProyectos()
        ])
        setListas(listasData)
        setProyectos(proyectosData)
      } catch (error) {
        console.error('❌ Error loading data:', error)
        toast.error('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // ✅ Filter listas when filters change
  useEffect(() => {
    const loadFilteredData = async () => {
      const filteredListas = await fetchListasEquipo(
        selectedProyecto === 'todos' ? undefined : selectedProyecto,
        selectedEstado === 'todos' ? undefined : selectedEstado as EstadoListaEquipo | 'todos' | 'all'
      )
      setListas(filteredListas)
    }

    loadFilteredData()
  }, [selectedProyecto, selectedEstado])

  // ✅ Filter by search term
  const filteredListas = listas.filter(lista => 
    lista.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lista.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lista.proyecto?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 🔍 Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, código o proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedProyecto} onValueChange={setSelectedProyecto}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {proyectos.map((proyecto) => (
              <SelectItem key={proyecto.id} value={proyecto.id}>
                {proyecto.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="EN_REVISION">En Revisión</SelectItem>
            <SelectItem value="APROBADA">Aprobada</SelectItem>
            <SelectItem value="RECHAZADA">Rechazada</SelectItem>
            <SelectItem value="COMPLETADA">Completada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 📊 Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredListas.length} de {listas.length} listas
        </p>
      </div>

      {/* 📋 Listas Grid */}
      {filteredListas.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Package className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No se encontraron listas</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedProyecto !== 'todos' || selectedEstado !== 'todos'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'No hay listas de equipos disponibles'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredListas.map((lista, index) => (
            <motion.div
              key={lista.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{lista.nombre}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono">{lista.codigo}</span>
                        <span>•</span>
                        <span>{lista.proyecto?.nombre}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={estadoBadgeVariant[lista.estado]}
                      className={estadoColors[lista.estado]}
                    >
                      {lista.estado.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{lista._count?.listaEquipoItem || 0} ítems</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(lista.createdAt), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                      {lista.fechaNecesaria && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Vence: {format(new Date(lista.fechaNecesaria), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/proyectos/${lista.proyecto?.id}/equipos/listas/${lista.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalles
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
