'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, Trash2, Edit3, Loader2, AlertCircle, FileText, Package, Wrench, Truck, DollarSign } from 'lucide-react'
import { deletePlantilla, updatePlantilla } from '@/lib/services/plantilla'
import { useState } from 'react'
import type { Plantilla } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Props {
  plantillas: any[]
  onDelete: (id: string) => void
  onUpdated: (actualizado: any) => void
  filterType?: 'todas' | 'equipos' | 'servicios' | 'gastos'
}

export default function PlantillaList({ plantillas, onDelete, onUpdated, filterType = 'todas' }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Formatear moneda
  const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
  }

  // Obtener información del tipo de plantilla
  const getTipoInfo = (tipo: string) => {
    switch (tipo) {
      case 'completa':
        return {
          label: 'Completa',
          icon: Package,
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      case 'equipos':
        return {
          label: 'Equipos',
          icon: Wrench,
          color: 'bg-orange-100 text-orange-800 border-orange-200'
        }
      case 'servicios':
        return {
          label: 'Servicios',
          icon: Truck,
          color: 'bg-green-100 text-green-800 border-green-200'
        }
      case 'gastos':
        return {
          label: 'Gastos',
          icon: DollarSign,
          color: 'bg-purple-100 text-purple-800 border-purple-200'
        }
      default:
        return {
          label: tipo,
          icon: FileText,
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
  }

  const startEdit = (id: string, currentValue: string) => {
    setEditingId(id)
    setEditValue(currentValue)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (id: string) => {
    if (!editValue.trim() || editValue.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres')
      return
    }

    setError(null)
    setLoadingId(id)
    try {
      let actualizado

      // Determine template type and call appropriate API based on filterType
      if (filterType === 'equipos') {
        // Equipment template
        const res = await fetch(`/api/plantillas/equipos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: editValue.trim() }),
        })
        if (!res.ok) throw new Error('Error al actualizar plantilla')
        actualizado = await res.json()
      } else if (filterType === 'servicios') {
        // Service template
        const res = await fetch(`/api/plantillas/servicios/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: editValue.trim() }),
        })
        if (!res.ok) throw new Error('Error al actualizar plantilla')
        actualizado = await res.json()
      } else if (filterType === 'gastos') {
        // Expense template
        const res = await fetch(`/api/plantillas/gastos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: editValue.trim() }),
        })
        if (!res.ok) throw new Error('Error al actualizar plantilla')
        actualizado = await res.json()
      } else {
        // Main template (filterType === 'todas')
        actualizado = await updatePlantilla(id, { nombre: editValue.trim() })
      }

      onUpdated(actualizado)
      setEditingId(null)
      setEditValue('')
    } catch (err) {
      console.error(err)
      setError('Error al actualizar la plantilla. Por favor, inténtalo de nuevo.')
    } finally {
      setLoadingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    
    setError(null)
    setLoadingId(deleteId)
    try {
      await deletePlantilla(deleteId)
      onDelete(deleteId)
      setDeleteId(null)
    } catch (err) {
      console.error(err)
      setError('Error al eliminar la plantilla. Por favor, inténtalo de nuevo.')
    } finally {
      setLoadingId(null)
    }
  }

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  if (plantillas.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
            <p className="text-muted-foreground text-center">
              Crea tu primera plantilla para comenzar a gestionar tus cotizaciones comerciales.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <>
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="mb-4"
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Plantillas {filterType !== 'todas' ? `de ${filterType.charAt(0).toUpperCase() + filterType.slice(1)}` : ''} ({plantillas.length})
            </CardTitle>
            <CardDescription>
              {filterType === 'todas'
                ? 'Gestiona tus plantillas de cotización comercial'
                : `Gestiona tus plantillas de ${filterType}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-right">Total Cliente</TableHead>
                  <TableHead className="text-right">Total Interno</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantillas.map((p, index) => (
                  <motion.tr
                    key={p.id}
                    variants={itemVariants}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <TableCell className="font-medium">
                      {editingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8"
                            disabled={loadingId === p.id}
                          />
                          <Button
                            size="sm"
                            onClick={() => saveEdit(p.id)}
                            disabled={loadingId === p.id || !editValue.trim()}
                          >
                            {loadingId === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Guardar'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={loadingId === p.id}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{p.nombre}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEdit(p.id, p.nombre)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        let tipo = 'completa'
                        if (p.plantillaServicioId !== undefined) {
                          tipo = 'servicios'
                        } else if (p.plantillaGastoId !== undefined) {
                          tipo = 'gastos'
                        } else if (p.plantillaEquipoId !== undefined) {
                          tipo = 'equipos'
                        } else {
                          tipo = p.tipo || 'completa'
                        }
                        const tipoInfo = getTipoInfo(tipo)
                        const IconComponent = tipoInfo.icon
                        return (
                          <Badge variant="outline" className={`flex items-center gap-1 w-fit mx-auto ${tipoInfo.color}`}>
                            <IconComponent className="h-3 w-3" />
                            {tipoInfo.label}
                          </Badge>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(p.totalCliente || p.grandTotal || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(p.totalInterno || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={(p.totalCliente || p.grandTotal || 0) > 0 ? 'default' : 'secondary'}>
                        {(p.totalCliente || p.grandTotal || 0) > 0 ? 'Configurada' : 'Vacía'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={(() => {
                            // Check if it's an independent template by looking for specific fields
                            if (p.plantillaServicioId !== undefined) {
                              return `/comercial/plantillas/servicios/${p.id}`
                            } else if (p.plantillaGastoId !== undefined) {
                              return `/comercial/plantillas/gastos/${p.id}`
                            } else if (p.plantillaEquipoId !== undefined) {
                              return `/comercial/plantillas/equipos/${p.id}`
                            } else {
                              // General template
                              const tipo = p.tipo || 'completa'
                              switch (tipo) {
                                case 'equipos':
                                  return `/comercial/plantillas/equipos/${p.id}`
                                case 'servicios':
                                  return `/comercial/plantillas/servicios/${p.id}`
                                case 'gastos':
                                  return `/comercial/plantillas/gastos/${p.id}`
                                default:
                                  return `/comercial/plantillas/${p.id}`
                              }
                            }
                          })()}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(p.id)}
                          disabled={loadingId === p.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {loadingId === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Eliminar Plantilla"
        description="¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </>
  )
}
