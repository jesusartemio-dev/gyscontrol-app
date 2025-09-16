// ===============================
// 📁 clienteImportUtils.ts
// 🔧 Utilidades para importar clientes desde Excel
// ===============================
import * as XLSX from 'xlsx'

/**
 * Interface para cliente importado desde Excel
 */
export interface ClienteImportado {
  codigo: string // ✅ Código ahora requerido
  nombre: string
  ruc?: string
  direccion?: string
  telefono?: string
  correo?: string
}

/**
 * Lee clientes desde un archivo Excel
 * @param file - Archivo Excel a procesar
 * @returns Promise con array de clientes importados
 */
export async function leerClientesDesdeExcel(file: File): Promise<ClienteImportado[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row, index) => {
    const codigo = row['Código'] ? (typeof row['Código'] === 'string' ? row['Código'].trim() : String(row['Código']).trim()) : ''
    const nombre = (typeof row['Nombre'] === 'string' ? row['Nombre'].trim() : String(row['Nombre'] || '').trim()) || ''
    
    // ✅ Validar que código y nombre sean requeridos
    if (!codigo) {
      throw new Error(`Fila ${index + 2}: El código es obligatorio`)
    }
    if (!nombre) {
      throw new Error(`Fila ${index + 2}: El nombre es obligatorio`)
    }
    
    return {
      codigo,
      nombre,
      ruc: row['RUC'] ? (typeof row['RUC'] === 'string' ? row['RUC'].trim() : String(row['RUC']).trim()) || undefined : undefined,
      direccion: row['Dirección'] ? (typeof row['Dirección'] === 'string' ? row['Dirección'].trim() : String(row['Dirección']).trim()) || undefined : undefined,
      telefono: row['Teléfono'] ? (typeof row['Teléfono'] === 'string' ? row['Teléfono'].trim() : String(row['Teléfono']).trim()) || undefined : undefined,
      correo: row['Correo'] ? (typeof row['Correo'] === 'string' ? row['Correo'].trim() : String(row['Correo']).trim()) || undefined : undefined
    }
  })
}

/**
 * Valida los clientes importados
 * @param clientes - Array de clientes a validar
 * @param existentes - Array de nombres de clientes existentes
 * @returns Objeto con clientes nuevos, errores y duplicados
 */
export function validarClientes(
  clientes: ClienteImportado[],
  codigosExistentes: string[]
): {
  nuevos: ClienteImportado[]
  errores: string[]
  duplicados: string[]
} {
  const nuevos: ClienteImportado[] = []
  const errores: string[] = []
  const duplicados: string[] = []

  for (const c of clientes) {
    // ✅ Validar código requerido (ya validado en leerClientesDesdeExcel)
    if (!c.codigo || c.codigo.trim() === '') {
      errores.push(`Código requerido para cliente: ${c.nombre}`)
      continue
    }
    
    // ✅ Validar nombre requerido (ya validado en leerClientesDesdeExcel)
    if (!c.nombre || c.nombre.trim() === '') {
      errores.push(`Nombre requerido para cliente con código: ${c.codigo}`)
      continue
    }
    
    // 🔍 Check for duplicates by codigo
    if (codigosExistentes.includes(c.codigo)) {
      duplicados.push(c.codigo)
      continue
    }
    
    // ✅ Validar formato de RUC si está presente
    if (c.ruc && c.ruc.length !== 11) {
      errores.push(`RUC inválido para ${c.nombre}: debe tener 11 dígitos.`)
      continue
    }
    
    // ✅ Validar formato de correo si está presente
    if (c.correo && !isValidEmail(c.correo)) {
      errores.push(`Correo inválido para ${c.nombre}: ${c.correo}`)
      continue
    }
    
    nuevos.push(c)
  }

  return { nuevos, errores, duplicados }
}

/**
 * Crea clientes en la base de datos a través de la API
 * @param clientes - Array de clientes a crear
 * @returns Promise con resultado de la importación
 */
export async function crearClientesEnBD(clientes: ClienteImportado[]): Promise<{
  message: string
  creados: number
  total: number
  errores?: string[]
}> {
  const response = await fetch('/api/cliente/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // ✅ Incluir cookies de sesión
    body: JSON.stringify({ clientes }),
  })
  
  if (!response.ok) {
    try {
      const errorData = await response.json()
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
    } catch (parseError) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  }
  
  return await response.json()
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
