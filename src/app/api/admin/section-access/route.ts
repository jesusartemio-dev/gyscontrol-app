// ===================================================
// API: Gestión de Acceso por Secciones
// GET - Obtener mapa de accesos por rol
// PUT - Actualizar acceso individual
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSectionAccessForAllRoles, updateSectionAccess, seedSectionAccess } from '@/lib/services/section-access'
import { SECTION_KEYS, ALL_ROLES } from '@/lib/config/sections'
import type { RolUsuario } from '@/types/modelos'

// GET /api/admin/section-access - Obtener mapa completo de accesos
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
    }

    const accessMap = await getSectionAccessForAllRoles()
    return NextResponse.json(accessMap)
  } catch (error) {
    console.error('[ERROR section-access GET]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/admin/section-access - Re-seed secciones faltantes
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
    }

    await seedSectionAccess()
    return NextResponse.json({ message: 'Secciones sincronizadas correctamente' })
  } catch (error) {
    console.error('[ERROR section-access POST]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}

// PUT /api/admin/section-access - Actualizar acceso individual
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { role, sectionKey, hasAccess } = body

    if (!role || !sectionKey || typeof hasAccess !== 'boolean') {
      return NextResponse.json({ message: 'role, sectionKey y hasAccess requeridos' }, { status: 400 })
    }

    // Validar que el rol existe
    if (!ALL_ROLES.includes(role)) {
      return NextResponse.json({ message: 'Rol no válido' }, { status: 400 })
    }

    // Validar que la sección existe
    if (!SECTION_KEYS.includes(sectionKey)) {
      return NextResponse.json({ message: 'Sección no válida' }, { status: 400 })
    }

    await updateSectionAccess(role, sectionKey, hasAccess, session.user.id)

    return NextResponse.json({
      message: hasAccess ? 'Acceso concedido' : 'Acceso revocado',
      role,
      sectionKey,
      hasAccess,
    })
  } catch (error) {
    console.error('[ERROR section-access PUT]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}
