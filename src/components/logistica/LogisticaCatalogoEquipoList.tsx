'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { CatalogoEquipo } from '@/types'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// Icons
import { 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  CheckCircle, 
  Clock, 
  XCircle,
  Package,
  DollarSign
} from 'lucide-react'

interface Props {
  data: CatalogoEquipo[]
  onUpdate: (id: string, data: Partial<CatalogoEquipo>) => void
  onDelete: (id: string) => void
}

export default function LogisticaCatalogoEquipoList({ data, onUpdate, onDelete }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<CatalogoEquipo>>({})

  const startEdit = (equipo: CatalogoEquipo) => {
    setEditId(equipo.id)
    setEditValues(equipo)
  }

  const handleSave = () => {
    if (editId) {
      onUpdate(editId, editValues)
      setEditId(null)
      setEditValues({})
    }
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditValues({})
  }

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'Pendiente':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'Inactivo':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
      case 'Pendiente':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendiente</Badge>
      case 'Inactivo':
        return <Badge variant="default" className="bg-red-100 text-red-800 hover:bg-red-100">Inactivo</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Código</TableHead>
            <TableHead className="font-semibold">Descripción</TableHead>
            <TableHead className="font-semibold">Categoría</TableHead>
            <TableHead className="font-semibold">Unidad</TableHead>
            <TableHead className="font-semibold">Marca</TableHead>
            <TableHead className="font-semibold">Precio Interno</TableHead>
            <TableHead className="font-semibold">Estado</TableHead>
            <TableHead className="font-semibold text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((eq, index) => (
            <motion.tr
              key={eq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group hover:bg-muted/30 transition-colors"
            >
              <TableCell className="font-mono text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {eq.codigo}
                </div>
              </TableCell>
              
              <TableCell className="max-w-xs">
                {editId === eq.id ? (
                  <Input
                    value={editValues.descripcion || ''}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                    className="h-8"
                    placeholder="Descripción del equipo"
                  />
                ) : (
                  <div className="truncate" title={eq.descripcion}>
                    {eq.descripcion}
                  </div>
                )}
              </TableCell>
              
              <TableCell>
                <Badge variant="outline" className="font-normal">
                  {eq.categoria.nombre}
                </Badge>
              </TableCell>
              
              <TableCell>
                <Badge variant="secondary" className="font-normal">
                  {eq.unidad.nombre}
                </Badge>
              </TableCell>
              
              <TableCell>
                {editId === eq.id ? (
                  <Input
                    value={editValues.marca || ''}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, marca: e.target.value }))
                    }
                    className="h-8"
                    placeholder="Marca"
                  />
                ) : (
                  <span className="font-medium">{eq.marca}</span>
                )}
              </TableCell>
              
              <TableCell>
                {editId === eq.id ? (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={editValues.precioInterno || ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          precioInterno: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="h-8 w-24"
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 font-medium text-green-700">
                    <DollarSign className="h-4 w-4" />
                    {eq.precioInterno?.toLocaleString() || '0'}
                  </div>
                )}
              </TableCell>
              
              <TableCell>
                {editId === eq.id ? (
                  <Select
                    value={editValues.estado || eq.estado}
                    onValueChange={(value) =>
                      setEditValues((prev) => ({ ...prev, estado: value }))
                    }
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Activo
                        </div>
                      </SelectItem>
                      <SelectItem value="Pendiente">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          Pendiente
                        </div>
                      </SelectItem>
                      <SelectItem value="Inactivo">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Inactivo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  getStatusBadge(eq.estado)
                )}
              </TableCell>
              
              <TableCell>
                <div className="flex items-center justify-center gap-2">
                  {editId === eq.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        className="h-8 w-8 p-0"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(eq)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El equipo <strong>{eq.codigo}</strong> será eliminado permanentemente del catálogo de logística.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(eq.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
