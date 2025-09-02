// ===================================================
// 📁 Archivo: ProductoForm.tsx
// 📌 Ubicación: src/components/catalogo/productos/
// 🔧 Descripción: Formulario para crear y editar productos
// 🎨 Mejoras UX/UI: React Hook Form, Zod, Shadcn/UI, Estados de carga
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ProductoService } from '@/lib/services/producto'
import { createProductoSchema, updateProductoSchema } from '@/lib/validators/catalogo'
import type { Producto } from '@prisma/client'
import type { CreateProductoPayload, UpdateProductoPayload } from '@/types/payloads'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { 
  Package,
  Save,
  X,
  AlertCircle,
  DollarSign,
  Hash,
  FileText,
  Tag,
  Ruler,
  ToggleLeft
} from 'lucide-react'

// 📋 Props del componente
interface ProductoFormProps {
  producto?: Producto
  onSuccess?: (producto: Producto) => void
  onCancel?: () => void
  mode?: 'create' | 'edit'
}

// 🎨 Variantes de animación
const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1
    }
  }
}

const fieldVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
}

/**
 * 📝 Componente ProductoForm
 * Formulario para crear y editar productos
 */
export default function ProductoForm({
  producto,
  onSuccess,
  onCancel,
  mode = producto ? 'edit' : 'create'
}: ProductoFormProps) {
  // 🔄 Estados del componente
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [unidades, setUnidades] = useState<string[]>([])

  // 📝 Configuración del formulario
  const schema = mode === 'edit' ? updateProductoSchema : createProductoSchema
  const form = useForm<CreateProductoPayload | UpdateProductoPayload>({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: producto?.codigo || '',
      nombre: producto?.nombre || '',
      descripcion: producto?.descripcion || '',
      categoria: producto?.categoria || '',
      precio: producto?.precio || 0,
      unidad: producto?.unidad || '',
      activo: producto?.activo ?? true,
      ...(mode === 'edit' && { id: producto?.id })
    }
  })

  // 🚀 Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 📊 Cargar categorías y unidades disponibles
        const [categoriasData, unidadesData] = await Promise.all([
          ProductoService.getCategorias(),
          ProductoService.getUnidades()
        ])
        
        setCategorias(categoriasData)
        setUnidades(unidadesData)
      } catch (error) {
        console.error('Error cargando datos iniciales:', error)
        toast.error('Error al cargar datos del formulario')
      }
    }

    loadInitialData()
  }, [])

  // 💾 Manejar envío del formulario
  const onSubmit = async (data: CreateProductoPayload | UpdateProductoPayload) => {
    try {
      setLoading(true)
      
      let result: Producto
      if (mode === 'edit' && producto) {
        result = await ProductoService.updateProducto(producto.id, data as UpdateProductoPayload)
        toast.success('Producto actualizado exitosamente')
      } else {
        result = await ProductoService.createProducto(data as CreateProductoPayload)
        toast.success('Producto creado exitosamente')
      }
      
      onSuccess?.(result)
    } catch (error: any) {
      console.error('Error guardando producto:', error)
      
      // 🚨 Manejo de errores específicos
      if (error.message?.includes('código ya existe')) {
        form.setError('codigo', {
          type: 'manual',
          message: 'Este código ya está en uso'
        })
      } else {
        toast.error(error.message || 'Error al guardar producto')
      }
    } finally {
      setLoading(false)
    }
  }

  // 🎨 Renderizado
  return (
    <motion.div
      variants={formVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 📊 Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">
            {mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 📝 Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 🔢 Código */}
                <motion.div variants={fieldVariants}>
                  <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Código *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: PROD-001"
                            {...field}
                            className="font-mono"
                          />
                        </FormControl>
                        <FormDescription>
                          Código único del producto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* 📝 Nombre */}
                <motion.div variants={fieldVariants}>
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nombre del producto"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              </div>

              {/* 📄 Descripción */}
              <motion.div variants={fieldVariants}>
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción detallada del producto"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            </CardContent>
          </Card>

          {/* 📊 Clasificación y precios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Clasificación y Precios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 📂 Categoría */}
                <motion.div variants={fieldVariants}>
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Categoría *
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categorias.map(categoria => (
                              <SelectItem key={categoria} value={categoria}>
                                {categoria}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* 💰 Precio */}
                <motion.div variants={fieldVariants}>
                  <FormField
                    control={form.control}
                    name="precio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Precio *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Precio en soles (PEN)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* 📏 Unidad */}
                <motion.div variants={fieldVariants}>
                  <FormField
                    control={form.control}
                    name="unidad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          Unidad *
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar unidad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {unidades.map(unidad => (
                              <SelectItem key={unidad} value={unidad}>
                                {unidad}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              </div>
            </CardContent>
          </Card>

          {/* ⚙️ Configuración */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-4 w-4" />
                Configuración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div variants={fieldVariants}>
                <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Estado Activo
                        </FormLabel>
                        <FormDescription>
                          Determina si el producto está disponible para su uso
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.div>
            </CardContent>
          </Card>

          {/* 🚀 Acciones */}
          <div className="flex items-center justify-end gap-4 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Guardando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {mode === 'edit' ? 'Actualizar' : 'Crear'}
                </div>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  )
}