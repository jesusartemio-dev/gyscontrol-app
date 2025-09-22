// ===================================================
// 📁 Archivo: usuario.ts
// 📌 Ubicación: src/lib/services/usuario.ts
// 🔧 Descripción: Servicios para gestión de usuarios
// ✅ Funciones para obtener usuarios
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { buildApiUrl } from '@/lib/utils'

// Tipos para usuarios
export interface Usuario {
  id: string
  name: string
  email: string
  role?: string
}

// ✅ Obtener todos los usuarios
export async function getUsuarios(): Promise<Usuario[]> {
  try {
    const response = await fetch(buildApiUrl('/api/admin/usuarios'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener usuarios: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Error en getUsuarios:', error)
    throw error
  }
}

// ✅ Obtener usuario por ID
export async function getUsuarioById(id: string): Promise<Usuario> {
  try {
    // Para obtener un usuario específico, usamos la API de admin con un filtro
    const response = await fetch(buildApiUrl('/api/admin/usuarios'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener usuarios: ${response.statusText}`)
    }

    const usuarios = await response.json()
    const usuario = usuarios.find((u: Usuario) => u.id === id)

    if (!usuario) {
      throw new Error('Usuario no encontrado')
    }

    return usuario
  } catch (error) {
    console.error('❌ Error en getUsuarioById:', error)
    throw error
  }
}