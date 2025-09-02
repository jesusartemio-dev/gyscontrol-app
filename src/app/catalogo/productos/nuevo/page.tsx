// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/productos/nuevo/
// 🔧 Descripción: Página para crear nuevo producto
// 🎨 Mejoras UX/UI: Breadcrumb, Autenticación, Autorización
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ProductoForm } from '@/components/catalogo/productos'

// 📋 Metadatos de la página
export const metadata: Metadata = {
  title: 'Nuevo Producto | GYS App',
  description: 'Crear un nuevo producto en el catálogo del sistema GYS',
}

/**
 * 🎯 Página para crear nuevo producto
 * Incluye autenticación, autorización y navegación
 */
export default async function NuevoProductoPage() {
  // 🔐 Verificar autenticación
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // ✅ Verificar autorización
  const allowedRoles = ['Admin', 'Gerente', 'Logistica']
  if (!allowedRoles.includes(session.user.rol)) {
    redirect('/unauthorized')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/catalogo">Catálogo</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/catalogo/productos">Productos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Nuevo Producto</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📝 Formulario de creación */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg border p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Crear Nuevo Producto
            </h1>
            <p className="text-muted-foreground">
              Complete la información del producto para agregarlo al catálogo.
            </p>
          </div>
          
          <ProductoForm
            mode="create"
            onSuccess={() => {
              // La redirección se maneja en el componente
            }}
            onCancel={() => {
              // La redirección se maneja en el componente
            }}
          />
        </div>
      </div>
    </div>
  )
}