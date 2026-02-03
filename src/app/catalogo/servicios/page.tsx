'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Services
import {
  getCatalogoServicios,
  createCatalogoServicio,
  updateCatalogoServicio,
  deleteCatalogoServicio,
} from '@/lib/services/catalogoServicio'
import { getEdts } from '@/lib/services/edt'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { exportarServiciosAExcel } from '@/lib/utils/serviciosExcel'
import {
  leerServiciosDesdeExcel,
  importarServiciosDesdeExcelValidado,
} from '@/lib/utils/serviciosImportUtils'

// Components
import CatalogoServicioTable from '@/components/catalogo/CatalogoServicioTable'
import CatalogoServicioForm from '@/components/catalogo/CatalogoServicioForm'
import ModalDuplicadosServicios from '@/components/catalogo/ModalDuplicadosServicios'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// Icons
import {
  Settings,
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react'

import type { CatalogoServicio } from '@/types'

export default function CatalogoServicioPage() {
  const [servicios, setServicios] = useState<CatalogoServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [duplicados, setDuplicados] = useState<{ id: string; nombre: string }[]>([])
  const [serviciosDuplicados, setServiciosDuplicados] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  const cargarServicios = async () => {
    try {
      setLoading(true)
      const data = await getCatalogoServicios()
      setServicios(data)
    } catch (err) {
      console.error('Error al cargar servicios:', err)
      toast.error('Error al cargar servicios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarServicios()
  }, [])

  const handleCreated = () => {
    cargarServicios()
    setShowCreateModal(false)
  }

  const actualizarServicio = async (servicio: CatalogoServicio) => {
    try {
      await updateCatalogoServicio(servicio.id, servicio)
      toast.success('Servicio actualizado')
      await cargarServicios()
    } catch (err) {
      toast.error('Error al actualizar servicio')
      console.error('Error al actualizar servicio:', err)
    }
  }

  const eliminarServicio = async (id: string) => {
    try {
      await deleteCatalogoServicio(id)
      toast.success('Servicio eliminado')
      await cargarServicios()
    } catch (error) {
      toast.error('Error al eliminar servicio')
      console.error('Error al eliminar servicio:', error)
    }
  }

  const handleExportar = async () => {
    try {
      await exportarServiciosAExcel(servicios)
      toast.success('Servicios exportados exitosamente.')
    } catch (err) {
      console.error('Error al exportar servicios:', err)
      toast.error('Error al exportar servicios.')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await leerServiciosDesdeExcel(file)
      const [categorias, unidades, recursos, serviciosExistentes] = await Promise.all([
        getEdts(),
        getUnidadesServicio(),
        getRecursos(),
        getCatalogoServicios(),
      ])

      const { serviciosNuevos, serviciosDuplicados, errores } =
        await importarServiciosDesdeExcelValidado(
          datos,
          categorias,
          unidades,
          recursos,
          serviciosExistentes.map((s) => ({ nombre: s.nombre, id: s.id }))
        )

      if (errores.length > 0) {
        setErrores(errores)
        toast.error('Errores encontrados en la importación.')
        return
      }

      if (serviciosNuevos.length > 0) {
        await Promise.all(serviciosNuevos.map((servicio) => createCatalogoServicio(servicio)))
        toast.success(`${serviciosNuevos.length} servicios nuevos creados.`)
      }

      if (serviciosDuplicados.length > 0) {
        setDuplicados(serviciosDuplicados.map((d) => ({ id: d.id, nombre: d.nombre })))
        setServiciosDuplicados(serviciosDuplicados)
        setMostrarModal(true)
      } else {
        await cargarServicios()
      }
    } catch (err) {
      console.error('Error inesperado al importar servicios:', err)
      toast.error('Error inesperado en la importación.')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const sobrescribirDuplicados = async () => {
    try {
      await Promise.all(serviciosDuplicados.map((servicio) => updateCatalogoServicio(servicio.id, servicio)))
      toast.success('Servicios duplicados sobrescritos exitosamente.')
      await cargarServicios()
    } catch (err) {
      console.error('Error al sobrescribir duplicados:', err)
      toast.error('Error al sobrescribir duplicados.')
    } finally {
      setMostrarModal(false)
      setDuplicados([])
      setServiciosDuplicados([])
    }
  }

  const cancelarImportacion = () => {
    setMostrarModal(false)
    setDuplicados([])
    setServiciosDuplicados([])
    toast('Importación cancelada.')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Servicios</h1>
          </div>
          <Badge variant="secondary" className="font-normal">
            {servicios.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Servicio</DialogTitle>
                <DialogDescription>
                  Agrega un servicio al catálogo
                </DialogDescription>
              </DialogHeader>
              <CatalogoServicioForm onCreated={handleCreated} />
            </DialogContent>
          </Dialog>
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
        </div>
      </div>

      {/* Import Status */}
      {importando && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Importando servicios...
        </div>
      )}

      {/* Error Display */}
      {errores.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
            <AlertCircle className="h-4 w-4" />
            Errores de importación:
          </div>
          <ul className="text-xs text-red-600 space-y-1 ml-6 list-disc">
            {errores.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
            {errores.length > 5 && <li>... y {errores.length - 5} más</li>}
          </ul>
        </div>
      )}

      {/* Services Table */}
      {servicios.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay servicios</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comienza agregando tu primer servicio al catálogo
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear servicio
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CatalogoServicioTable
          data={servicios}
          onUpdate={actualizarServicio}
          onDelete={eliminarServicio}
        />
      )}

      {/* Modal for Duplicates */}
      {mostrarModal && (
        <ModalDuplicadosServicios
          duplicados={duplicados}
          onConfirm={sobrescribirDuplicados}
          onCancel={cancelarImportacion}
        />
      )}
    </div>
  )
}
