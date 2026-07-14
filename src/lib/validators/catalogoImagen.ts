import { z } from 'zod'

export const CATEGORIAS_CATALOGO_IMAGEN = ['EQUIPO', 'HERRAMIENTA', 'EPP', 'OTRO'] as const
export type CategoriaCatalogoImagen = (typeof CATEGORIAS_CATALOGO_IMAGEN)[number]

export const catalogoImagenCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  categoria: z.enum(CATEGORIAS_CATALOGO_IMAGEN),
  keywords: z.array(z.string().min(1)).default([]),
})

export const catalogoImagenUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  categoria: z.enum(CATEGORIAS_CATALOGO_IMAGEN).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  activo: z.boolean().optional(),
})
