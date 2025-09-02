// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/productos/[id]/
// 🔧 Descripción: Página de detalle de producto individual
// 🎨 Mejoras UX/UI: Layout detallado, Breadcrumbs, Estados de carga
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import React from 'react'
import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProductoService } from '@/lib/services/producto'
import ProductoDetailClient from './ProductoDetailClient'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Package, Home } from 'lucide-react'

// 📋 Props de la página
interface ProductoDetailPageProps {
  params: Promise<{
    id: string
  }>
}

// 📊 Generar metadata dinámicamente
export async function generateMetadata(
  { params }: ProductoDetailPageProps
): Promise<Metadata> {
  try {
    const { id } = await params;
    const producto = await ProductoService.getProductoById(id)
    
    return {
      title: `${producto.nombre} | Productos | Sistema GYS`,
      description: `Detalles del producto ${producto.nombre} - ${producto.descripcion || 'Sin descripción'}`,
      keywords: ['producto', producto.nombre, producto.categoria, 'catálogo']
    }
  } catch (error) {
    return {
      title: 'Producto no encontrado | Sistema GYS',
      description: 'El producto solicitado no fue encontrado'
    }
  }
}

/**
 * 📦 Página de Detalle de Producto
 * Muestra información detallada de un producto específico
 */
export default async function ProductoDetailPage({ params }: ProductoDetailPageProps) {
  const { id } = await params;
  
  // 🔐 Verificar autenticación y autorización
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // ✅ Verificar permisos de acceso
  const allowedRoles = ['Admin', 'Gerente', 'Logistica', 'Gestor', 'Comercial', 'Proyectos']
  if (!allowedRoles.includes(session.user.rol)) {
    redirect('/denied')
  }

  // 📊 Obtener datos del producto
  let producto
  try {
    producto = await ProductoService.getProductoById(id)
  } catch (error) {
    console.error('Error obteniendo producto:', error)
    notFound()
  }

  if (!producto) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/catalogo">Catálogo</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/catalogo/productos">
              <Package className="h-4 w-4 mr-1" />
              Productos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[200px] truncate">
              {producto.nombre}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📊 Header de la página */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <span className="truncate">{producto.nombre}</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground font-mono text-sm">
              Código: {producto.codigo}
            </p>
            <div className="h-4 w-px bg-border" />
            <p className="text-muted-foreground text-sm">
              Categoría: {producto.categoria}
            </p>
          </div>
        </div>
      </div>

      {/* 🎯 Componente cliente con funcionalidades */}
      <ProductoDetailClient 
        producto={producto} 
        userRole={session.user.rol}
      />
    </div>
  )
}