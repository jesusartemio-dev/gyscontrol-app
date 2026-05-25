import { normalizeStr } from '@/lib/utils'
// ===================================================
// 📁 Archivo: catalogoEquipos.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio para gestión de catálogo de equipos
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-09-24
// ===================================================

export interface CatalogoEquipo {
  id: string
  codigo: string
  descripcion: string
  marca: string
  precioInterno: number
  precioVenta: number
  estado: string
  categoria: string
  unidad: string
}

export async function obtenerCatalogoEquipos(): Promise<CatalogoEquipo[]> {
  // Mock implementation for testing
  return [
    {
      id: '1',
      codigo: 'EQ001',
      descripcion: 'Equipo de prueba',
      marca: 'Marca Test',
      precioInterno: 1000,
      precioVenta: 1200,
      estado: 'activo',
      categoria: 'Herramientas',
      unidad: 'unidad'
    }
  ]
}

export async function buscarEquipos(query: string): Promise<CatalogoEquipo[]> {
  const equipos = await obtenerCatalogoEquipos()
  return equipos.filter(equipo =>
    normalizeStr(equipo.descripcion).includes(normalizeStr(query)) ||
    normalizeStr(equipo.codigo).includes(normalizeStr(query))
  )
}
