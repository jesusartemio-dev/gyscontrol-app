'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Plus,
  AlertCircle,
  Loader2,
  Download,
  Wrench,
  Truck,
  DollarSign,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PlantillaModal from '@/components/plantillas/PlantillaModal'
import PlantillaModalEquipos from '@/components/plantillas/PlantillaModalEquipos'
import PlantillaModalServicios from '@/components/plantillas/PlantillaModalServicios'
import PlantillaModalGastos from '@/components/plantillas/PlantillaModalGastos'
import PlantillasView from '@/components/plantillas/PlantillasView'
import { getPlantillas, getPlantillasEquipos, getPlantillasServicios, getPlantillasGastos } from '@/lib/services/plantilla'
import type { Plantilla } from '@/types'

type TemplateFilter = 'todas' | 'completas' | 'equipos' | 'servicios' | 'gastos'

export default function PlantillasPage() {
  const router = useRouter()
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [plantillasEquipos, setPlantillasEquipos] = useState<any[]>([])
  const [plantillasServicios, setPlantillasServicios] = useState<any[]>([])
  const [plantillasGastos, setPlantillasGastos] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<TemplateFilter>('todas')

  // Estados para controlar modales y dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showModalCompleta, setShowModalCompleta] = useState(false)
  const [showModalEquipos, setShowModalEquipos] = useState(false)
  const [showModalServicios, setShowModalServicios] = useState(false)
  const [showModalGastos, setShowModalGastos] = useState(false)

  useEffect(() => {
    const loadAllTemplates = async () => {
      try {
        setLoading(true)
        const [general, equipos, servicios, gastos] = await Promise.all([
          getPlantillas(),
          getPlantillasEquipos(),
          getPlantillasServicios(),
          getPlantillasGastos()
        ])

        const generalWithTipo = general.map((p: any) => ({ ...p, tipo: p.tipo || 'completa' }))
        const equiposWithTipo = equipos.map((p: any) => ({ ...p, tipo: 'equipos' }))
        const serviciosWithTipo = servicios.map((p: any) => ({ ...p, tipo: 'servicios' }))
        const gastosWithTipo = gastos.map((p: any) => ({ ...p, tipo: 'gastos' }))

        setPlantillas(generalWithTipo)
        setPlantillasEquipos(equiposWithTipo)
        setPlantillasServicios(serviciosWithTipo)
        setPlantillasGastos(gastosWithTipo)
      } catch (error) {
        console.error('Error loading templates:', error)
        setError('Error al cargar plantillas.')
      } finally {
        setLoading(false)
      }
    }

    loadAllTemplates()
  }, [])

  const handleCreated = (nueva: any, tipo?: 'equipos' | 'servicios' | 'gastos') => {
    if (tipo === 'equipos') {
      setPlantillasEquipos((prev) => [...prev, { ...nueva, tipo: 'equipos' }])
    } else if (tipo === 'servicios') {
      setPlantillasServicios((prev) => [...prev, { ...nueva, tipo: 'servicios' }])
    } else if (tipo === 'gastos') {
      setPlantillasGastos((prev) => [...prev, { ...nueva, tipo: 'gastos' }])
    } else {
      setPlantillas((prev) => [...prev, nueva])
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/plantilla/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al eliminar plantilla')

      setPlantillas((prev) => prev.filter((p) => p.id !== id))
      setPlantillasEquipos((prev) => prev.filter((p) => p.id !== id))
      setPlantillasServicios((prev) => prev.filter((p) => p.id !== id))
      setPlantillasGastos((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleUpdated = (actualizada: any) => {
    setPlantillas((prev) => prev.map((p) => p.id === actualizada.id ? actualizada : p))
    setPlantillasEquipos((prev) => prev.map((p) => p.id === actualizada.id ? actualizada : p))
    setPlantillasServicios((prev) => prev.map((p) => p.id === actualizada.id ? actualizada : p))
    setPlantillasGastos((prev) => prev.map((p) => p.id === actualizada.id ? actualizada : p))
  }

  const handleEdit = (id: string, currentName: string) => {
    const newName = prompt('Editar nombre de plantilla:', currentName)
    if (newName && newName.trim() && newName.trim() !== currentName) {
      const template = getCurrentTemplates().find(p => p.id === id)
      if (template) {
        handleUpdated({ ...template, nombre: newName.trim() })
      }
    }
  }

  const getCurrentTemplates = () => {
    switch (activeFilter) {
      case 'completas':
        return plantillas.filter(p => !p.tipo || p.tipo === 'completa')
      case 'equipos':
        return plantillasEquipos.filter(p => p.tipo === 'equipos')
      case 'servicios':
        return plantillasServicios.filter(p => p.tipo === 'servicios')
      case 'gastos':
        return plantillasGastos.filter(p => p.tipo === 'gastos')
      default:
        const completas = plantillas.filter(p => !p.tipo || p.tipo === 'completa')
        const equiposEspecificos = plantillasEquipos.filter(p => p.tipo === 'equipos')
        const serviciosEspecificos = plantillasServicios.filter(p => p.tipo === 'servicios')
        const gastosEspecificos = plantillasGastos.filter(p => p.tipo === 'gastos')
        const allTemplates = [...completas, ...equiposEspecificos, ...serviciosEspecificos, ...gastosEspecificos]
        return allTemplates.filter((template, index, self) =>
          index === self.findIndex(t => t.id === template.id)
        )
    }
  }

  // Counts
  const completasCount = plantillas.filter(p => !p.tipo || p.tipo === 'completa').length
  const equiposCount = plantillasEquipos.filter(p => p.tipo === 'equipos').length
  const serviciosCount = plantillasServicios.filter(p => p.tipo === 'servicios').length
  const gastosCount = plantillasGastos.filter(p => p.tipo === 'gastos').length
  const todasCount = completasCount + equiposCount + serviciosCount + gastosCount

  const currentTemplates = getCurrentTemplates()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Plantillas</h1>
          <Badge variant="secondary" className="text-xs">
            {todasCount}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline Stats */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <div className="flex items-center gap-1 text-blue-600" title="Completas">
              <Package className="h-3.5 w-3.5" />
              <span className="font-medium">{completasCount}</span>
            </div>
            <div className="flex items-center gap-1 text-orange-600" title="Equipos">
              <Wrench className="h-3.5 w-3.5" />
              <span className="font-medium">{equiposCount}</span>
            </div>
            <div className="flex items-center gap-1 text-green-600" title="Servicios">
              <Truck className="h-3.5 w-3.5" />
              <span className="font-medium">{serviciosCount}</span>
            </div>
            <div className="flex items-center gap-1 text-purple-600" title="Gastos">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium">{gastosCount}</span>
            </div>
          </div>

          <Button variant="outline" size="sm" className="h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar
          </Button>

          {/* Create Dropdown */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nueva
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onSelect={() => {
                  setDropdownOpen(false)
                  setTimeout(() => setShowModalCompleta(true), 150)
                }}
              >
                <Package className="h-4 w-4 mr-2 text-blue-600" />
                Completa
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setDropdownOpen(false)
                  setTimeout(() => setShowModalEquipos(true), 150)
                }}
              >
                <Wrench className="h-4 w-4 mr-2 text-orange-600" />
                Equipos
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setDropdownOpen(false)
                  setTimeout(() => setShowModalServicios(true), 150)
                }}
              >
                <Truck className="h-4 w-4 mr-2 text-green-600" />
                Servicios
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setDropdownOpen(false)
                  setTimeout(() => setShowModalGastos(true), 150)
                }}
              >
                <DollarSign className="h-4 w-4 mr-2 text-purple-600" />
                Gastos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Modales controlados externamente */}
          <PlantillaModal
            isOpen={showModalCompleta}
            onClose={() => setShowModalCompleta(false)}
            onCreated={(nueva) => {
              handleCreated(nueva)
              setShowModalCompleta(false)
              router.push(`/comercial/plantillas/${nueva.id}`)
            }}
          />
          <PlantillaModalEquipos
            isOpen={showModalEquipos}
            onClose={() => setShowModalEquipos(false)}
            onCreated={(nueva) => {
              handleCreated(nueva, 'equipos')
              setShowModalEquipos(false)
              router.push(`/comercial/plantillas/equipos/${nueva.id}`)
            }}
          />
          <PlantillaModalServicios
            isOpen={showModalServicios}
            onClose={() => setShowModalServicios(false)}
            onCreated={(nueva) => {
              handleCreated(nueva, 'servicios')
              setShowModalServicios(false)
              router.push(`/comercial/plantillas/servicios/${nueva.id}`)
            }}
          />
          <PlantillaModalGastos
            isOpen={showModalGastos}
            onClose={() => setShowModalGastos(false)}
          />
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="md:hidden grid grid-cols-4 gap-2">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-blue-600">{completasCount}</div>
          <div className="text-[10px] text-blue-700">Completas</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-orange-600">{equiposCount}</div>
          <div className="text-[10px] text-orange-700">Equipos</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">{serviciosCount}</div>
          <div className="text-[10px] text-green-700">Servicios</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-purple-600">{gastosCount}</div>
          <div className="text-[10px] text-purple-700">Gastos</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={activeFilter === 'todas' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveFilter('todas')}
          className="h-7 text-xs"
        >
          Todas
          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{todasCount}</Badge>
        </Button>
        <Button
          variant={activeFilter === 'completas' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveFilter('completas')}
          className="h-7 text-xs"
        >
          <Package className="h-3 w-3 mr-1" />
          Completas
          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{completasCount}</Badge>
        </Button>
        <Button
          variant={activeFilter === 'equipos' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveFilter('equipos')}
          className="h-7 text-xs"
        >
          <Wrench className="h-3 w-3 mr-1" />
          Equipos
          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{equiposCount}</Badge>
        </Button>
        <Button
          variant={activeFilter === 'servicios' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveFilter('servicios')}
          className="h-7 text-xs"
        >
          <Truck className="h-3 w-3 mr-1" />
          Servicios
          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{serviciosCount}</Badge>
        </Button>
        <Button
          variant={activeFilter === 'gastos' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveFilter('gastos')}
          className="h-7 text-xs"
        >
          <DollarSign className="h-3 w-3 mr-1" />
          Gastos
          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{gastosCount}</Badge>
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plantillas List */}
      {todasCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay plantillas
            </h3>
            <p className="text-gray-500 mb-4">
              Comienza creando tu primera plantilla comercial
            </p>
            <PlantillaModal
              onCreated={(nueva) => {
                handleCreated(nueva)
                router.push(`/comercial/plantillas/${nueva.id}`)
              }}
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Plantilla
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <PlantillasView
          plantillas={currentTemplates}
          filterType={activeFilter}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}
    </div>
  )
}
