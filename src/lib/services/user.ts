// ===================================================
// 📁 Archivo: user.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicios para gestionar usuarios
// 🧠 Uso: Obtener usuarios para filtros y selecciones
// ✍️ Autor: IA GYS + Jesús Artemio
// 📅 Última actualización: 2025-01-27
// ===================================================

import { User } from '@/types'

const BASE_URL = '/api/admin/usuarios'

// ✅ Obtener todos los usuarios
export async function getUsers(): Promise<User[] | null> {
  try {
    const res = await fetch(BASE_URL, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Error al obtener usuarios')
    return await res.json()
  } catch (error) {
    console.error('❌ getUsers:', error)
    return null
  }
}

// ✅ Obtener usuario por ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Error al obtener usuario')
    return await res.json()
  } catch (error) {
    console.error('❌ getUserById:', error)
    return null
  }
}