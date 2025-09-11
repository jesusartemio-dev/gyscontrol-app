// ===================================================
// 📁 Archivo: /api/debug/session/route.ts
// 🔧 Descripción: Endpoint para debuggear la sesión de NextAuth
// ✍️ Autor: GYS AI Assistant
// 📅 Fecha: 2025-01-27
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Debug: Obteniendo sesión...')
    
    // Obtener la sesión
    const session = await getServerSession(authOptions)
    
    console.log('📋 Sesión obtenida:', {
      exists: !!session,
      user: session?.user,
      userId: session?.user?.id
    })
    
    if (!session) {
      return NextResponse.json({
        error: 'No hay sesión activa',
        session: null,
        user: null
      }, { status: 401 })
    }
    
    if (!session.user?.id) {
      return NextResponse.json({
        error: 'Sesión sin ID de usuario',
        session: session,
        user: session.user
      }, { status: 400 })
    }
    
    // Verificar si el usuario existe en la base de datos
    const userInDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })
    
    console.log('👤 Usuario en BD:', userInDb)
    
    return NextResponse.json({
      success: true,
      session: {
        user: session.user,
        expires: session.expires
      },
      userInDatabase: userInDb,
      canCreateLista: !!userInDb
    })
    
  } catch (error) {
    console.error('❌ Error en debug session:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: String(error)
    }, { status: 500 })
  }
}