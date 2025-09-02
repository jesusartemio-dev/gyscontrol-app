/**
 * 📡 Tipos de Payloads - Generado automáticamente desde Prisma
 * 
 * ⚠️  NO EDITAR MANUALMENTE - Se regenera automáticamente
 * 
 * Generado: 2025-08-31T23:52:07.243Z
 */

import type { User, Cliente, Proveedor } from './modelos';
// OrdenCompra, Recepcion, Pago removidos

// ✅ User Payloads
export interface CreateUserPayload extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {}
export interface UpdateUserPayload extends Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> {}
export interface UserResponse extends User {}

// ✅ Cliente Payloads
export interface CreateClientePayload extends Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'> {}
export interface UpdateClientePayload extends Partial<Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>> {}
export interface ClienteResponse extends Cliente {}

// ✅ Proveedor Payloads
export interface CreateProveedorPayload extends Omit<Proveedor, 'id' | 'createdAt' | 'updatedAt'> {}
export interface UpdateProveedorPayload extends Partial<Omit<Proveedor, 'id' | 'createdAt' | 'updatedAt'>> {}
export interface ProveedorResponse extends Proveedor {}

// OrdenCompra, Recepcion, Pago payloads removidos

