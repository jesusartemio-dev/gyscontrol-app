// ===================================================
// 📋 API: Asignación de Permisos a Usuarios
// Endpoints para gestionar permisos específicos por usuario
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assignPermissionToUser, revokePermissionFromUser } from '@/lib/services/permissions'
import type { RolUsuario } from '@/types/modelos'

// ✅ POST /api/admin/user-permissions - Asignar permisos a usuario (bulk)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !['admin'].includes(session.user.role as RolUsuario)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, permissions } = body

    if (!userId || !Array.isArray(permissions)) {
      return NextResponse.json({ message: 'userId y permissions requeridos' }, { status: 400 })
    }

    // Procesar cada permiso
    const results = []
    for (const perm of permissions) {
      try {
        if (perm.type === 'grant') {
          const result = await assignPermissionToUser({
            userId,
            permissionId: perm.permissionId,
            type: 'grant'
          }, session.user.id)
          results.push({ permissionId: perm.permissionId, success: true, result })
        } else if (perm.type === 'deny') {
          const result = await assignPermissionToUser({
            userId,
            permissionId: perm.permissionId,
            type: 'deny'
          }, session.user.id)
          results.push({ permissionId: perm.permissionId, success: true, result })
        }
      } catch (error) {
        console.error(`Error asignando permiso ${perm.permissionId}:`, error)
        results.push({ permissionId: perm.permissionId, success: false, error: error instanceof Error ? error.message : 'Error desconocido' })
      }
    }

    return NextResponse.json({
      message: 'Permisos procesados',
      results
    })

  } catch (error) {
    console.error('[ERROR asignar permisos bulk]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}

// ✅ DELETE /api/admin/user-permissions - Revocar permisos de usuario
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !['admin'].includes(session.user.role as RolUsuario)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, permissionId } = body

    if (!userId || !permissionId) {
      return NextResponse.json({ message: 'userId y permissionId requeridos' }, { status: 400 })
    }

    await revokePermissionFromUser(userId, permissionId, session.user.id)

    return NextResponse.json({ message: 'Permiso revocado exitosamente' })

  } catch (error) {
    console.error('[ERROR revocar permiso]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}