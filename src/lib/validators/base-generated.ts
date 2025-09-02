/**
 * 🔍 Validadores Zod Base - Generado automáticamente desde Prisma
 * 
 * ⚠️  NO EDITAR MANUALMENTE - Se regenera automáticamente
 * ⚠️  Personaliza en archivos específicos según el módulo
 * 
 * Generado: 2025-08-31T23:52:07.243Z
 */

import { z } from 'zod';

// ✅ User Validators
export const userSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string(),
  emailVerified: z.date().optional(),
  password: z.string(),
  role: z.unknown(),
  image: z.string().optional(),
  accounts: z.unknown().array(),
  cotizaciones: z.unknown().array(),
  listaEquipos: z.unknown().array(),
  listaEquipoItems: z.unknown().array(),
  pedidoEquipos: z.unknown().array(),
  pedidoEquipoItems: z.unknown().array(),
  ProyectoEquipos: z.unknown().array(),
  ProyectoServicios: z.unknown().array(),
  registrosHoras: z.unknown().array(),
  sessions: z.unknown().array(),
  // Referencias de aprovisionamiento eliminadas
});

export const createUserSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const updateUserSchema = createUserSchema.partial();

// ✅ Cliente Validators
export const clienteSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  ruc: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  correo: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  cotizaciones: z.unknown().array(),
  proyectos: z.unknown().array(),
});

export const createClienteSchema = clienteSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const updateClienteSchema = createClienteSchema.partial();

// ✅ Proveedor Validators
export const proveedorSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  ruc: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  cotizaciones: z.unknown().array(),
  listas: z.unknown().array(),
  // Referencias de aprovisionamiento eliminadas
});

export const createProveedorSchema = proveedorSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const updateProveedorSchema = createProveedorSchema.partial();

// ✅ Validadores de aprovisionamiento eliminados
// OrdenCompra, Recepcion y Pago schemas removidos

