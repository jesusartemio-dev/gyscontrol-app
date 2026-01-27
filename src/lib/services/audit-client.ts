// ===================================================
// 📁 Archivo: audit-client.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios de auditoría client-safe (solo fetch)
// ===================================================

import type { AuditLog } from '@/types/modelos';

const BASE_URL = '/api/audit';

// ✅ Obtener historial de auditoría para una entidad específica
export async function getAuditHistory(
  entidadTipo: string,
  entidadId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  try {
    const url = `${BASE_URL}?entidadTipo=${entidadTipo}&entidadId=${entidadId}&limit=${limit}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error('Error al obtener el historial de auditoría');
    }

    return await res.json();
  } catch (error) {
    console.error('❌ getAuditHistory:', error);
    return [];
  }
}

// ✅ Formatear cambios para mostrar en la UI
export function formatAuditChanges(cambios: string | null | undefined): Record<string, any> {
  if (!cambios) return {};

  try {
    return JSON.parse(cambios);
  } catch (error) {
    console.error('Error parsing audit changes:', error);
    return {};
  }
}

// ✅ Formatear descripción de cambios para mostrar
export function formatAuditDescription(log: AuditLog): string {
  const cambios = formatAuditChanges(log.cambios);

  if (Object.keys(cambios).length === 0) {
    return log.descripcion;
  }

  const changedFields = Object.keys(cambios);
  if (changedFields.length === 1) {
    const field = changedFields[0];
    const { anterior, nuevo } = cambios[field];
    return `${log.descripcion}: ${field} cambió de "${anterior || 'vacío'}" a "${nuevo || 'vacío'}"`;
  }

  return `${log.descripcion}: ${changedFields.length} campos modificados`;
}