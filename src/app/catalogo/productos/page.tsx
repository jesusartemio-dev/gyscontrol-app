// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/productos/
// 🔧 Descripción: Página principal de gestión de productos
// 🎨 Mejoras UX/UI: Layout responsive, Breadcrumbs, Estados de carga
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import React from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ProductosClient from './ProductosClient'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Package, Home } from 'lucide-react'

// 📊 Metadata de la página
export const metadata: Metadata = {
  title: 'Productos | Sistema GYS',
  description: 'Gestión de productos del catálogo - Sistema GYS',
  keywords: ['productos', 'catálogo', 'inventario', 'gestión']
}

/**
 * 📦 Página de Productos
 * Página principal para la gestión de productos del catálogo
 */
export default async function ProductosPage() {
  // 🔐 Verificar autenticación y autorización
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // ✅ Verificar permisos de acceso
  const allowedRoles = ['Admin', 'Gerente', 'Logistica', 'Gestor']
  if (!allowedRoles.includes(session.user.rol)) {
    redirect('/denied')
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
            <BreadcrumbPage className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📊 Header de la página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            Gestión de Productos
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra el catálogo de productos disponibles en el sistema
          </p>
        </div>
      </div>

      {/* 🎯 Componente cliente con funcionalidades */}
      <ProductosClient userRole={session.user.rol} />
    </div>
  )
}