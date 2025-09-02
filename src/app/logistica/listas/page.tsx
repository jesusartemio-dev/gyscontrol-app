// ===================================================
// 📁 Archivo: src/app/logistica/listas/page.tsx
// 📌 Descripción: Página principal para mostrar todas las listas técnicas relevantes para logística
// 🧠 Uso: Llama al backend separado, muestra resumen y tarjetas usando los nuevos componentes
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LogisticaListasStats from '@/components/logistica/LogisticaListasStats'
import LogisticaListasFilters from '@/components/logistica/LogisticaListasFilters'
import LogisticaListasTable from '@/components/logistica/LogisticaListasTable'
import LogisticaListaTecnicaList from '@/components/logistica/LogisticaListaTecnicaList'
import { buildApiUrl } from '@/lib/utils'
import type { ListaEquipo, Proyecto, EstadoListaEquipo } from '@/types'

export default function LogisticaListasPage() {
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [listasFiltradas, setListasFiltradas] = useState<ListaEquipo[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const [listasRes, proyectosRes] = await Promise.all([
        fetch(buildApiUrl('/api/lista-equipo')),
        fetch(buildApiUrl('/api/proyecto'))
      ])
      
      const listasData = await listasRes.json()
      const proyectosData = await proyectosRes.json()
      
      setListas(listasData)
      setListasFiltradas(listasData)
      setProyectos(proyectosData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handle filtered lists from the filter component
  const handleFiltersChange = useCallback((filteredListas: ListaEquipo[]) => {
    setListasFiltradas(filteredListas)
  }, [])

  const handleRefresh = () => {
    fetchData()
  }



  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Listas Técnicas
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión completa de listas de equipos por proyecto
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Lista
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <LogisticaListasStats 
        listas={listas} 
        proyectos={proyectos} 
      />

      {/* Filters */}
      <LogisticaListasFilters
        proyectos={proyectos}
        listas={listas}
        onFiltersChange={handleFiltersChange}
      />

      {/* Content Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'cards')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="table">Vista Tabla</TabsTrigger>
            <TabsTrigger value="cards">Vista Tarjetas</TabsTrigger>
          </TabsList>
          
          <div className="text-sm text-gray-600">
            Mostrando {listasFiltradas.length} de {listas.length} listas
          </div>
        </div>

        <TabsContent value="table" className="mt-6">
          <LogisticaListasTable 
            listas={listasFiltradas}
            proyectos={proyectos}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="cards" className="mt-6">
          <LogisticaListaTecnicaList listas={listasFiltradas} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
