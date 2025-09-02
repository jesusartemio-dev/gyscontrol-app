// ===================================================
// 📁 Archivo: ProductoSelect.tsx
// 📌 Ubicación: src/components/catalogo/productos/
// 🔧 Descripción: Selector de productos con búsqueda y filtros
// 🎨 Mejoras UX/UI: Combobox, Shadcn/UI, Estados de carga
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProductoService } from '@/lib/services/producto'
import type { Producto } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Package,
  Search,
  Check,
  ChevronsUpDown,
  X,
  Filter,
  DollarSign,
  Tag,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 📋 Props del componente
interface ProductoSelectProps {
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  placeholder?: string
  multiple?: boolean
  disabled?: boolean
  required?: boolean
  showPrice?: boolean
  showCategory?: boolean
  filterByCategory?: string
  filterByActive?: boolean
  className?: string
  error?: string
}

// 🎨 Variantes de animación
const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

/**
 * 🔍 Componente ProductoSelect
 * Selector de productos con funcionalidades avanzadas
 */
export default function ProductoSelect({
  value,
  onValueChange,
  placeholder = "Seleccionar producto...",
  multiple = false,
  disabled = false,
  required = false,
  showPrice = true,
  showCategory = true,
  filterByCategory,
  filterByActive = true,
  className,
  error
}: ProductoSelectProps) {
  // 🔄 Estados del componente
  const [open, setOpen] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<string>(filterByCategory || 'all')
  const [categorias, setCategorias] = useState<string[]>([])

  // 🚀 Cargar productos
  const loadProductos = async () => {
    try {
      setLoading(true)
      const filters = {
        search: searchTerm || undefined,
        categoria: categoriaFilter !== 'all' ? categoriaFilter : undefined,
        activo: filterByActive,
        limit: 100, // Límite para el selector
        sortBy: 'nombre' as const,
        sortOrder: 'asc' as const
      }
      
      const result = await ProductoService.getProductos(filters)
      setProductos(result.productos)
      
      // 📈 Obtener categorías únicas si no las tenemos
      if (categorias.length === 0 && result.categorias) {
        setCategorias(result.categorias)
      }
    } catch (error) {
      console.error('Error cargando productos:', error)
      setProductos([])
    } finally {
      setLoading(false)
    }
  }

  // 🔄 Efectos
  useEffect(() => {
    if (open) {
      loadProductos()
    }
  }, [open, searchTerm, categoriaFilter])

  // 📊 Productos filtrados
  const filteredProductos = useMemo(() => {
    return productos.filter(producto => {
      const matchesSearch = !searchTerm || 
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [productos, searchTerm])

  // 🎯 Productos seleccionados
  const selectedProductos = useMemo(() => {
    if (!value) return []
    
    const ids = Array.isArray(value) ? value : [value]
    return productos.filter(p => ids.includes(p.id))
  }, [value, productos])

  // ✅ Manejar selección
  const handleSelect = (productoId: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : (value ? [value] : [])
      const newValues = currentValues.includes(productoId)
        ? currentValues.filter(id => id !== productoId)
        : [...currentValues, productoId]
      onValueChange?.(newValues)
    } else {
      onValueChange?.(productoId)
      setOpen(false)
    }
  }

  // 🗑️ Remover selección
  const handleRemove = (productoId: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      const newValues = currentValues.filter(id => id !== productoId)
      onValueChange?.(newValues)
    } else {
      onValueChange?.('')
    }
  }

  // 🎨 Obtener texto del placeholder
  const getPlaceholderText = () => {
    if (selectedProductos.length === 0) {
      return placeholder
    }
    
    if (multiple) {
      return `${selectedProductos.length} producto(s) seleccionado(s)`
    }
    
    return selectedProductos[0]?.nombre || placeholder
  }

  // 🎨 Renderizado
  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
              error && "border-red-500"
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Package className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{getPlaceholderText()}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Buscar productos..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
            </div>
            
            {/* 🔍 Filtros */}
            {categorias.length > 0 && (
              <div className="p-2 border-b">
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categorias.map(categoria => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Cargando...</span>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="flex flex-col items-center py-6 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No se encontraron productos
                      </p>
                    </div>
                  </CommandEmpty>
                  
                  <CommandGroup>
                    <AnimatePresence>
                      {filteredProductos.map((producto) => {
                        const isSelected = multiple 
                          ? Array.isArray(value) && value.includes(producto.id)
                          : value === producto.id
                        
                        return (
                          <motion.div
                            key={producto.id}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <CommandItem
                              value={`${producto.codigo} ${producto.nombre}`}
                              onSelect={() => handleSelect(producto.id)}
                              className="flex items-center justify-between p-3 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Check
                                  className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium truncate">
                                      {producto.nombre}
                                    </span>
                                    {showCategory && (
                                      <Badge variant="outline" className="text-xs">
                                        {producto.categoria}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-mono">{producto.codigo}</span>
                                    {showPrice && (
                                      <>
                                        <Separator orientation="vertical" className="h-3" />
                                        <div className="flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />
                                          {producto.precio.toFixed(2)}
                                        </div>
                                      </>
                                    )}
                                    <Separator orientation="vertical" className="h-3" />
                                    <span>{producto.unidad}</span>
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* 🏷️ Productos seleccionados (modo múltiple) */}
      {multiple && selectedProductos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {selectedProductos.map((producto) => (
              <motion.div
                key={producto.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="truncate max-w-[120px]">
                    {producto.nombre}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemove(producto.id)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {/* 🚨 Mensaje de error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      
      {/* ⚠️ Indicador de requerido */}
      {required && !value && (
        <div className="text-xs text-muted-foreground">
          * Campo requerido
        </div>
      )}
    </div>
  )
}

// 🎯 Componente simplificado para uso en formularios
export function ProductoSelectField({
  value,
  onChange,
  error,
  ...props
}: Omit<ProductoSelectProps, 'onValueChange'> & {
  onChange?: (value: string | string[]) => void
}) {
  return (
    <ProductoSelect
      value={value}
      onValueChange={onChange}
      error={error}
      {...props}
    />
  )
}