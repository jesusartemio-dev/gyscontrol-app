// ===================================================
// 📋 API: Gestión de Permisos
// Endpoints para administrar permisos del sistema
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ALL_BASE_PERMISSIONS } from '@/lib/permissions/base-permissions'
import type { Permission } from '@/types/modelos'

// ✅ GET /api/admin/permissions - Obtener todos los permisos
export async function GET() {
  try {
    const permissions = await (prisma as any).permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    })

    return NextResponse.json(permissions)
  } catch (error) {
    console.error('[ERROR obtener permisos]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}

// ✅ POST /api/admin/permissions - Crear permiso personalizado
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, resource, action } = body

    // Validaciones
    if (!name || !resource || !action) {
      return NextResponse.json({ message: 'Campos requeridos faltantes' }, { status: 400 })
    }

    // Verificar que no exista
    const existing = await (prisma as any).permission.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ message: 'El permiso ya existe' }, { status: 409 })
    }

    // Crear permiso
    const newPermission = await (prisma as any).permission.create({
      data: {
        name,
        description,
        resource,
        action,
        isSystemPermission: false
      }
    })

    return NextResponse.json(newPermission)
  } catch (error) {
    console.error('[ERROR crear permiso]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}

// ✅ PUT /api/admin/permissions - Actualizar permiso
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, description } = body

    if (!id) {
      return NextResponse.json({ message: 'ID requerido' }, { status: 400 })
    }

    // Verificar que no sea un permiso del sistema
    const permission = await prisma.permission.findUnique({ where: { id } })
    if (!permission) {
      return NextResponse.json({ message: 'Permiso no encontrado' }, { status: 404 })
    }

    if (permission.isSystemPermission) {
      return NextResponse.json({ message: 'No se pueden modificar permisos del sistema' }, { status: 403 })
    }

    // Actualizar
    const updated = await (prisma as any).permission.update({
      where: { id },
      data: { description }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[ERROR actualizar permiso]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}

// ✅ DELETE /api/admin/permissions - Eliminar permiso personalizado
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ message: 'ID requerido' }, { status: 400 })
    }

    // Verificar que no sea un permiso del sistema
    const permission = await (prisma as any).permission.findUnique({ where: { id } })
    if (!permission) {
      return NextResponse.json({ message: 'Permiso no encontrado' }, { status: 404 })
    }

    if (permission.isSystemPermission) {
      return NextResponse.json({ message: 'No se pueden eliminar permisos del sistema' }, { status: 403 })
    }

    // Verificar que no esté asignado a ningún usuario
    const userPermissions = await prisma.userPermission.findFirst({
      where: { permissionId: id }
    })

    if (userPermissions) {
      return NextResponse.json({
        message: 'No se puede eliminar el permiso porque está asignado a usuarios'
      }, { status: 409 })
    }

    // Eliminar
    await prisma.permission.delete({ where: { id } })

    return NextResponse.json({ message: 'Permiso eliminado' })
  } catch (error) {
    console.error('[ERROR eliminar permiso]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}
