// ===================================================
// 📁 Archivo: ClienteTableView.tsx
// 📌 Ubicación: src/components/clientes/ClienteTableView.tsx
// 🔧 Descripción: Vista en tabla para clientes con funcionalidades avanzadas
// 🧠 Uso: Componente para mostrar clientes en formato de tabla
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
import { Cliente } from '@/types'

interface ClienteTableViewProps {
  clientes: Cliente[]
  onEdit?: (cliente: Cliente) => void
  onDelete?: (cliente: Cliente) => void
  isLoading?: boolean
}

type SortField = 'nombre' | 'ruc' | 'direccion' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export function ClienteTableView({
  clientes,
  onEdit,
  onDelete,
  isLoading = false
}: ClienteTableViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('nombre')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filter and sort clientes
  const filteredAndSortedClientes = clientes
    .filter(cliente => {
      const searchLower = searchTerm.toLowerCase()
      return (
        cliente.nombre.toLowerCase().includes(searchLower) ||
        cliente.ruc?.toLowerCase().includes(searchLower) ||
        cliente.direccion?.toLowerCase().includes(searchLower) ||
        cliente.telefono?.toLowerCase().includes(searchLower) ||
        cliente.correo?.toLowerCase().includes(searchLower)
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return (
      <ArrowUpDown 
        className={`ml-2 h-4 w-4 ${
          sortDirection === 'asc' ? 'rotate-180' : ''
        } transition-transform`} 
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-10 bg-gray-200 rounded w-80 animate-pulse" />
        </div>
        <div className="border rounded-lg">
          <div className="h-12 bg-gray-100 border-b animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b last:border-b-0 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredAndSortedClientes.length} cliente{filteredAndSortedClientes.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('nombre')}
              >
                <div className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" />
                  Cliente
                  {getSortIcon('nombre')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('direccion')}
              >
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Dirección
                  {getSortIcon('direccion')}
                </div>
              </TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedClientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No se encontraron clientes que coincidan con la búsqueda' : 'No hay clientes registrados'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedClientes.map((cliente, index) => (
                <motion.tr
                  key={cliente.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="truncate max-w-[200px] font-medium" title={cliente.nombre}>
                          {cliente.nombre}
                        </span>
                      </div>
                      {cliente.ruc && (
                        <div className="flex items-center gap-1">
                          <Hash className="h-3 w-3 text-gray-400" />
                          <Badge variant="secondary" className="font-mono text-xs">
                            {cliente.ruc}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {cliente.direccion ? (
                      <span className="text-sm truncate max-w-[200px] block" title={cliente.direccion}>
                        {cliente.direccion}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {cliente.telefono && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{cliente.telefono}</span>
                        </div>
                      )}
                      {cliente.correo && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-blue-600 truncate max-w-[150px]" title={cliente.correo}>
                            {cliente.correo}
                          </span>
                        </div>
                      )}
                      {!cliente.telefono && !cliente.correo && (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {cliente.ruc && (
                        <Badge variant="outline" className="text-xs">
                          Con RUC
                        </Badge>
                      )}
                      {cliente.correo && (
                        <Badge variant="outline" className="text-xs">
                          Con Email
                        </Badge>
                      )}
                      {!cliente.ruc && !cliente.correo && (
                        <Badge variant="secondary" className="text-xs">
                          Básico
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(cliente)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(cliente)}
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

      {/* Summary */}
      {filteredAndSortedClientes.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Mostrando {filteredAndSortedClientes.length} de {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
        </div>
      )}
    </motion.div>
  )
}

export default ClienteTableView
