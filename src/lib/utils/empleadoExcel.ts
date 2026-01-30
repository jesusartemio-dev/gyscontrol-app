// ===============================
// 📁 empleadoExcel.ts
// 🔧 Utilidades para exportar/importar empleados desde Excel
// ===============================
import * as XLSX from 'xlsx'
import type { Empleado } from '@/types/modelos'

/**
 * Interface para empleado importado desde Excel
 */
export interface EmpleadoImportado {
  email: string // Para vincular con usuario existente
  cargo?: string // Nombre del cargo
  departamento?: string // Nombre del departamento
  sueldoPlanilla?: number
  sueldoHonorarios?: number
  fechaIngreso?: string
  documentoIdentidad?: string
  telefono?: string
  direccion?: string
  observaciones?: string
  activo: boolean
}

/**
 * Exporta la lista de empleados a un archivo Excel
 * @param empleados - Array de empleados a exportar
 */
export function exportarEmpleadosAExcel(empleados: Empleado[]) {
  const data = empleados.map((e) => ({
    Nombre: e.user?.name || '',
    Email: e.user?.email || '',
    Cargo: e.cargo?.nombre || '',
    Departamento: e.departamento?.nombre || '',
    'Sueldo Planilla': e.sueldoPlanilla || '',
    'Sueldo Honorarios': e.sueldoHonorarios || '',
    'Fecha Ingreso': e.fechaIngreso ? new Date(e.fechaIngreso).toLocaleDateString('es-PE') : '',
    DNI: e.documentoIdentidad || '',
    Teléfono: e.telefono || '',
    Estado: e.activo ? 'Activo' : 'Inactivo'
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)

  const columnWidths = [
    { wch: 25 }, // Nombre
    { wch: 30 }, // Email
    { wch: 20 }, // Cargo
    { wch: 20 }, // Departamento
    { wch: 15 }, // Sueldo Planilla
    { wch: 18 }, // Sueldo Honorarios
    { wch: 15 }, // Fecha Ingreso
    { wch: 12 }, // DNI
    { wch: 15 }, // Teléfono
    { wch: 12 }, // Estado
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `empleados_${timestamp}.xlsx`)
}

/**
 * Genera una plantilla Excel para importar empleados
 * Formato idéntico al de exportación
 */
export function generarPlantillaEmpleados() {
  const ejemplos = [
    {
      Nombre: '(se ignora, usar Email)',
      Email: 'juan@empresa.com',
      Cargo: 'Ingeniero Senior',
      Departamento: 'Proyectos',
      'Sueldo Planilla': 3500,
      'Sueldo Honorarios': 1500,
      'Fecha Ingreso': '01/01/2024',
      DNI: '12345678',
      Teléfono: '999888777',
      Estado: 'Activo'
    },
    {
      Nombre: '(se ignora, usar Email)',
      Email: 'maria@empresa.com',
      Cargo: 'Técnico',
      Departamento: 'SGI',
      'Sueldo Planilla': 2000,
      'Sueldo Honorarios': 500,
      'Fecha Ingreso': '15/03/2024',
      DNI: '87654321',
      Teléfono: '999777666',
      Estado: 'Activo'
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  const columnWidths = [
    { wch: 25 }, // Nombre
    { wch: 30 }, // Email
    { wch: 20 }, // Cargo
    { wch: 20 }, // Departamento
    { wch: 15 }, // Sueldo Planilla
    { wch: 18 }, // Sueldo Honorarios
    { wch: 15 }, // Fecha Ingreso
    { wch: 12 }, // DNI
    { wch: 15 }, // Teléfono
    { wch: 12 }, // Estado
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados')

  XLSX.writeFile(workbook, 'plantilla_empleados.xlsx')
}

/**
 * Helper para obtener valor de columna con múltiples nombres posibles
 */
function getColumn(row: Record<string, any>, ...names: string[]): any {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== '') {
      return row[name]
    }
  }
  return undefined
}

/**
 * Lee empleados desde un archivo Excel
 * @param file - Archivo Excel a procesar
 * @returns Promise con array de empleados importados
 */
export async function leerEmpleadosDesdeExcel(file: File): Promise<EmpleadoImportado[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  console.log('📊 Columnas en Excel:', json.length > 0 ? Object.keys(json[0]) : 'vacío')
  console.log('📊 Primera fila:', json[0])

  return json.map((row, index) => {
    // Buscar email en múltiples posibles nombres de columna
    const emailRaw = getColumn(row, 'Email', 'email', 'EMAIL', 'Correo', 'correo')
    const email = (typeof emailRaw === 'string' ? emailRaw.trim() : String(emailRaw || '').trim())

    if (!email) {
      throw new Error(`Fila ${index + 2}: El email es obligatorio`)
    }

    const estadoRaw = getColumn(row, 'Estado', 'estado', 'ESTADO', 'Activo', 'activo')
    const estadoStr = typeof estadoRaw === 'string' ? estadoRaw.toLowerCase().trim() : 'activo'
    const activo = estadoStr === 'activo' || estadoStr === 'si' || estadoStr === 'sí' || estadoStr === 'true' || estadoStr === '1'

    // Parse fecha ingreso
    let fechaIngreso: string | undefined
    const fechaRaw = getColumn(row, 'Fecha Ingreso', 'FechaIngreso', 'fecha_ingreso', 'Fecha ingreso')
    if (fechaRaw) {
      if (typeof fechaRaw === 'number') {
        // Excel date serial number
        const date = XLSX.SSF.parse_date_code(fechaRaw)
        fechaIngreso = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
      } else if (typeof fechaRaw === 'string') {
        // Try to parse DD/MM/YYYY or YYYY-MM-DD
        const parts = fechaRaw.split(/[\/\-]/)
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            fechaIngreso = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
          } else {
            fechaIngreso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          }
        }
      }
    }

    const cargo = getColumn(row, 'Cargo', 'cargo', 'CARGO')
    const departamento = getColumn(row, 'Departamento', 'departamento', 'DEPARTAMENTO', 'Depto')
    const sueldoPlanilla = getColumn(row, 'Sueldo Planilla', 'SueldoPlanilla', 'sueldo_planilla', 'Planilla')
    const sueldoHonorarios = getColumn(row, 'Sueldo Honorarios', 'SueldoHonorarios', 'sueldo_honorarios', 'Honorarios')
    const dni = getColumn(row, 'DNI', 'dni', 'Documento Identidad', 'DocumentoIdentidad', 'documento_identidad')
    const telefono = getColumn(row, 'Teléfono', 'Telefono', 'telefono', 'TELEFONO', 'Tel')
    const direccion = getColumn(row, 'Dirección', 'Direccion', 'direccion', 'DIRECCION')
    const observaciones = getColumn(row, 'Observaciones', 'observaciones', 'OBSERVACIONES', 'Notas')

    return {
      email,
      cargo: cargo ? String(cargo).trim() || undefined : undefined,
      departamento: departamento ? String(departamento).trim() || undefined : undefined,
      sueldoPlanilla: sueldoPlanilla ? parseFloat(String(sueldoPlanilla)) || undefined : undefined,
      sueldoHonorarios: sueldoHonorarios ? parseFloat(String(sueldoHonorarios)) || undefined : undefined,
      fechaIngreso,
      documentoIdentidad: dni ? String(dni).trim() || undefined : undefined,
      telefono: telefono ? String(telefono).trim() || undefined : undefined,
      direccion: direccion ? String(direccion).trim() || undefined : undefined,
      observaciones: observaciones ? String(observaciones).trim() || undefined : undefined,
      activo
    }
  })
}

/**
 * Valida los empleados importados
 * Ya no omite duplicados - el API los actualizará
 */
export function validarEmpleados(
  empleados: EmpleadoImportado[],
  emailsUsuarios: string[],
  emailsEmpleadosExistentes: string[]
): {
  validos: EmpleadoImportado[]
  nuevos: number
  actualizaciones: number
  errores: string[]
  sinUsuario: string[]
} {
  const validos: EmpleadoImportado[] = []
  const errores: string[] = []
  const sinUsuario: string[] = []
  const emailsVistos = new Set<string>()
  let nuevos = 0
  let actualizaciones = 0

  for (const e of empleados) {
    if (!e.email || e.email.trim() === '') {
      errores.push(`Email requerido`)
      continue
    }

    const emailNorm = e.email.toLowerCase()

    // Check if user exists
    if (!emailsUsuarios.map(em => em.toLowerCase()).includes(emailNorm)) {
      sinUsuario.push(e.email)
      continue
    }

    // Check for duplicates in import file
    if (emailsVistos.has(emailNorm)) {
      errores.push(`Email duplicado en archivo: ${e.email}`)
      continue
    }

    emailsVistos.add(emailNorm)

    // Count if it's new or update
    if (emailsEmpleadosExistentes.map(em => em.toLowerCase()).includes(emailNorm)) {
      actualizaciones++
    } else {
      nuevos++
    }

    validos.push(e)
  }

  return { validos, nuevos, actualizaciones, errores, sinUsuario }
}

/**
 * Crea o actualiza empleados en la base de datos a través de la API
 */
export async function crearEmpleadosEnBD(empleados: EmpleadoImportado[]): Promise<{
  message: string
  creados: number
  actualizados: number
  total: number
  errores?: string[]
}> {
  const response = await fetch('/api/empleado/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ empleados }),
  })

  if (!response.ok) {
    try {
      const errorData = await response.json()
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
    } catch {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  }

  return await response.json()
}
