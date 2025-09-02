// ===================================================
// 📁 Archivo: ProveedorList.tsx
// 📌 Ubicación: src/components/logistica/ProveedorList.tsx
// 🔧 Descripción: Lista moderna de proveedores con tabla profesional
// 🧠 Uso: Tabla con edición inline, estados vacíos y acciones mejoradas
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Pencil, 
  Save, 
  Trash2, 
  X, 
  Search, 
  Building2, 
  Hash, 
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  Users,
  Package
} from 'lucide-react'
import { Proveedor, ProveedorUpdatePayload } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface Props {
  data: Proveedor[]
  onUpdate: (id: string, payload: ProveedorUpdatePayload) => void
  onDelete: (id: string) => void
  loading?: boolean
}

export default function ProveedorList({ data, onUpdate, onDelete, loading = false }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, Partial<Proveedor>>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [proveedorToDelete, setProveedorToDelete] = useState<Proveedor | null>(null)

  // Filter and search logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    
    return data.filter(proveedor => 
      proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proveedor.ruc && proveedor.ruc.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [data, searchTerm])

  const handleEdit = (proveedor: Proveedor) => {
    setEditId(proveedor.id)
    setEditValues({
      ...editValues,
      [proveedor.id]: { nombre: proveedor.nombre, ruc: proveedor.ruc },
    })
  }

  const handleSave = async (id: string) => {
    const values = editValues[id]
    if (!values?.nombre?.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      await onUpdate(id, values as ProveedorUpdatePayload)
      setEditId(null)
      setEditValues({ ...editValues, [id]: {} })
    } catch (error) {
      toast.error('Error al actualizar proveedor')
    }
  }

  const handleCancel = (id: string) => {
    setEditId(null)
    setEditValues({ ...editValues, [id]: {} })
  }

  const handleChange = (id: string, field: keyof Proveedor, value: string) => {
    setEditValues({
      ...editValues,
      [id]: { ...editValues[id], [field]: value },
    })
  }

  const handleDeleteClick = (proveedor: Proveedor) => {
    setProveedorToDelete(proveedor)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (proveedorToDelete) {
      try {
        await onDelete(proveedorToDelete.id)
        setDeleteDialogOpen(false)
        setProveedorToDelete(null)
      } catch (error) {
        toast.error('Error al eliminar proveedor')
      }
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              Lista de Proveedores
              <Badge variant="secondary" className="ml-2">
                {filteredData.length} {filteredData.length === 1 ? 'proveedor' : 'proveedores'}
              </Badge>
            </CardTitle>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredData.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              {data.length === 0 ? (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay proveedores registrados
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Comienza agregando tu primer proveedor usando el formulario de arriba
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No se encontraron proveedores
                    </h3>
                    <p className="text-gray-500 mb-4">
                      No hay proveedores que coincidan con tu búsqueda "{searchTerm}"
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchTerm('')}
                      className="hover:bg-gray-50"
                    >
                      Limpiar búsqueda
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Nombre
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        RUC
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredData.map((proveedor, index) => {
                      const isEditing = editId === proveedor.id
                      const edited = editValues[proveedor.id] || {}

                      return (
                        <motion.tr
                          key={proveedor.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={edited.nombre ?? proveedor.nombre}
                                onChange={(e) => handleChange(proveedor.id, 'nombre', e.target.value)}
                                placeholder="Nombre del proveedor"
                                className="min-w-[200px]"
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{proveedor.nombre}</p>
                                  <p className="text-sm text-gray-500">Proveedor</p>
                                </div>
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={edited.ruc ?? proveedor.ruc ?? ''}
                                onChange={(e) => handleChange(proveedor.id, 'ruc', e.target.value)}
                                placeholder="RUC (opcional)"
                                maxLength={11}
                                className="min-w-[150px]"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                {proveedor.ruc ? (
                                  <>
                                    <Hash className="h-4 w-4 text-gray-400" />
                                    <span className="font-mono text-sm">{proveedor.ruc}</span>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-sm">Sin RUC</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center">
                            <Badge 
                              variant={proveedor.ruc ? "default" : "secondary"}
                              className={proveedor.ruc ? "bg-green-100 text-green-700 border-green-200" : ""}
                            >
                              {proveedor.ruc ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Formal
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Informal
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSave(proveedor.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancel(proveedor.id)}
                                    className="hover:bg-gray-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-gray-100"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={() => handleEdit(proveedor)}
                                      className="cursor-pointer"
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteClick(proveedor)}
                                      className="cursor-pointer text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Confirmar eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el proveedor <strong>{proveedorToDelete?.nombre}</strong>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
