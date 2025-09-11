// ===================================================
// 📁 Archivo: ProveedorTableView.tsx
// 📌 Ubicación: src/components/logistica/ProveedorTableView.tsx
// 🔧 Descripción: Vista en tabla para proveedores con funcionalidades avanzadas
// 🧠 Uso: Componente para mostrar proveedores en formato de tabla
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Hash, 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  MoreVertical,
  ArrowUpDown,
  Search
} from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Proveedor } from '@/types'

interface ProveedorTableViewProps {
  proveedores: Proveedor[]
  onEdit?: (proveedor: Proveedor) => void
  onDelete?: (proveedor: Proveedor) => void
  isLoading?: boolean
}

type SortField = 'nombre' | 'ruc' | 'direccion' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export function ProveedorTableView({
  proveedores,
  onEdit,
  onDelete,
  isLoading = false
}: ProveedorTableViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('nombre')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filter and sort proveedores
  const filteredAndSortedProveedores = proveedores
    .filter(proveedor => {
      const searchLower = searchTerm.toLowerCase()
      return (
        proveedor.nombre.toLowerCase().includes(searchLower) ||
        proveedor.ruc?.toLowerCase().includes(searchLower) ||
        proveedor.direccion?.toLowerCase().includes(searchLower) ||
        proveedor.telefono?.toLowerCase().includes(searchLower) ||
        proveedor.correo?.toLowerCase().includes(searchLower)
      )
    })
    .sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''
      
      switch (sortField) {
        case 'nombre':
          aValue = a.nombre
          bValue = b.nombre
          break
        case 'ruc':
          aValue = a.ruc || ''
          bValue = b.ruc || ''
          break
        case 'direccion':
          aValue = a.direccion || ''
          bValue = b.direccion || ''
          break
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime()
          bValue = new Date(b.createdAt || 0).getTime()
          break
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === 'asc' ? comparison : -comparison
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-10 bg-gray-200 rounded w-80 animate-pulse"></div>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 6 }).map((_, index) => (
                  <TableHead key={index}>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar proveedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredAndSortedProveedores.length} de {proveedores.length} proveedores
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[250px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('nombre')}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Nombre
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('ruc')}
                >
                  <Hash className="mr-2 h-4 w-4" />
                  RUC
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('direccion')}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Dirección
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[140px]">
                <div className="flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  Teléfono
                </div>
              </TableHead>
              <TableHead className="w-[200px]">
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Correo
                </div>
              </TableHead>
              <TableHead className="w-[100px] text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProveedores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Building2 className="h-12 w-12 mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">
                      {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                    </p>
                    <p className="text-sm">
                      {searchTerm 
                        ? 'Intenta con otros términos de búsqueda' 
                        : 'Comienza agregando tu primer proveedor'
                      }
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedProveedores.map((proveedor, index) => (
                <motion.tr
                  key={proveedor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        {proveedor.nombre}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={proveedor.ruc ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {proveedor.ruc ? 'Con RUC' : 'Sin RUC'}
                        </Badge>
                        {proveedor.createdAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(proveedor.createdAt).toLocaleDateString('es-PE')}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {proveedor.ruc ? (
                      <span className="font-mono text-sm">{proveedor.ruc}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {proveedor.direccion ? (
                      <span className="text-sm line-clamp-2">{proveedor.direccion}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {proveedor.telefono ? (
                      <span className="font-mono text-sm">{proveedor.telefono}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {proveedor.correo ? (
                      <span className="text-sm truncate">{proveedor.correo}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(proveedor)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(proveedor)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default ProveedorTableView
