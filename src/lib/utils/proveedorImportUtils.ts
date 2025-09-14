// ===============================
// 📁 proveedorImportUtils.ts
// 🔧 Utilidades para importar proveedores desde Excel
// ===============================
import * as XLSX from 'xlsx'

/**
 * Interface para proveedor importado desde Excel
 */
export interface ProveedorImportado {
  nombre: string
  ruc?: string
  direccion?: string
  telefono?: string
  correo?: string
}

/**
 * Lee proveedores desde un archivo Excel
 * @param file - Archivo Excel a procesar
 * @returns Promise con array de proveedores importados
 */
export async function leerProveedoresDesdeExcel(file: File): Promise<ProveedorImportado[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => ({
    nombre: (typeof row['Nombre'] === 'string' ? row['Nombre'].trim() : String(row['Nombre'] || '').trim()) || '',
    ruc: row['RUC'] ? (typeof row['RUC'] === 'string' ? row['RUC'].trim() : String(row['RUC']).trim()) || undefined : undefined,
    direccion: row['Dirección'] ? (typeof row['Dirección'] === 'string' ? row['Dirección'].trim() : String(row['Dirección']).trim()) || undefined : undefined,
    telefono: row['Teléfono'] ? (typeof row['Teléfono'] === 'string' ? row['Teléfono'].trim() : String(row['Teléfono']).trim()) || undefined : undefined,
    correo: row['Correo'] ? (typeof row['Correo'] === 'string' ? row['Correo'].trim() : String(row['Correo']).trim()) || undefined : undefined
  }))
}

/**
 * Valida los proveedores importados
 * @param proveedores - Array de proveedores a validar
 * @param existentes - Array de proveedores existentes
 * @returns Objeto con proveedores nuevos, errores y duplicados
 */
export function validarProveedores(
  proveedores: ProveedorImportado[],
  existentes: any[]
): {
  nuevos: ProveedorImportado[]
  errores: string[]
  duplicados: string[]
} {
  const nuevos: ProveedorImportado[] = []
  const errores: string[] = []
  const duplicados: string[] = []

  for (const p of proveedores) {
    // ✅ Validar nombre obligatorio
    if (!p.nombre) {
      errores.push('Proveedor sin nombre válido.')
      continue
    }
    
    // ✅ Verificar duplicados
    const existeNombre = existentes.some(e => e.nombre === p.nombre)
    const existeRuc = p.ruc && existentes.some(e => e.ruc === p.ruc)
    
    if (existeNombre || existeRuc) {
      duplicados.push(p.nombre)
      continue
    }
    
    // ✅ Validar formato de RUC si está presente
    if (p.ruc && p.ruc.length !== 11) {
      errores.push(`RUC inválido para ${p.nombre}: debe tener 11 dígitos.`)
      continue
    }
    
    // ✅ Validar formato de teléfono si está presente
    if (p.telefono && !isValidPhone(p.telefono)) {
      errores.push(`Teléfono inválido para ${p.nombre}: ${p.telefono}`)
      continue
    }
    
    // ✅ Validar formato de correo si está presente
    if (p.correo && !isValidEmail(p.correo)) {
      errores.push(`Correo inválido para ${p.nombre}: ${p.correo}`)
      continue
    }
    
    nuevos.push(p)
  }

  return { nuevos, errores, duplicados }
}

/**
 * Valida formato de email
 * @param email - Email a validar
 * @returns true si es válido, false si no
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida formato de teléfono
 * @param phone - Teléfono a validar
 * @returns true si es válido, false si no
 */
function isValidPhone(phone: string): boolean {
  // Acepta formatos: +51123456789, 123456789, (01)1234567, etc.
  const phoneRegex = /^[\+]?[0-9\(\)\-\s]{7,15}$/
  return phoneRegex.test(phone.trim())
}

/**
 * Crea proveedores en la base de datos a través de la API
 * @param proveedores - Array de proveedores a crear
 * @returns Promise con resultado de la importación
 */
export async function crearProveedoresEnBD(proveedores: ProveedorImportado[]): Promise<any> {
  const response = await fetch('/api/proveedor/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ proveedores }),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Error al importar proveedores')
  }
  
  return await response.json()
}

/**
 * Exporta proveedores a un archivo Excel
 * @param proveedores - Array de proveedores a exportar
 */
export function exportarProveedoresAExcel(proveedores: any[]): void {
  // ✅ Prepare data for Excel export
  const data = proveedores.map(p => ({
    'Nombre': p.nombre || '',
    'RUC': p.ruc || '',
    'Dirección': p.direccion || '',
    'Teléfono': p.telefono || '',
    'Correo': p.correo || ''
  }))

  // ✅ Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Proveedores')

  // ✅ Set column widths for better readability
  const colWidths = [
    { wch: 30 }, // Nombre
    { wch: 15 }, // RUC
    { wch: 40 }, // Dirección
    { wch: 15 }, // Teléfono
    { wch: 25 }  // Correo
  ]
  ws['!cols'] = colWidths

  // ✅ Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `proveedores_${timestamp}.xlsx`

  // ✅ Download file
  XLSX.writeFile(wb, filename)
}
