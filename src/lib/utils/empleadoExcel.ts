// ===============================
// 📁 empleadoExcel.ts
// 🔧 Utilidades para exportar/importar empleados desde Excel
// ===============================
import * as XLSX from 'xlsx'
import type { Empleado } from '@/types/modelos'
import { calcularCostosLaborales } from './costosLaborales'

/**
 * Interface para empleado importado desde Excel
 */
export interface EmpleadoImportado {
  email: string // Para vincular con usuario existente
  cargo?: string // Nombre del cargo
  departamento?: string // Nombre del departamento
  sueldoPlanilla?: number
  sueldoHonorarios?: number
  asignacionFamiliar?: number // Asignación familiar
  emo?: number // EMO mensual
  fechaIngreso?: string
  documentoIdentidad?: string
  telefono?: string
  direccion?: string
  observaciones?: string
  activo: boolean
}

// Helper para redondear a 2 decimales
const round2 = (n: number): number | '' => n > 0 ? Math.round(n * 100) / 100 : ''

/**
 * Exporta la lista de empleados a un archivo Excel con todos los costos laborales
 * Formato estilo hoja de cálculo HH (Horas Hombre)
 * @param empleados - Array de empleados a exportar
 */
export function exportarEmpleadosAExcel(empleados: Empleado[]) {
  const data = empleados.map((e, index) => {
    const costos = calcularCostosLaborales(e)
    return {
      'N°': index + 1,
      'Apellidos y Nombres': e.user?.name || '',
      'DNI': e.documentoIdentidad || '',
      'F. Ingreso': e.fechaIngreso ? new Date(e.fechaIngreso).toLocaleDateString('es-PE') : '',
      'Cargo': e.cargo?.nombre || '',
      'Area': e.departamento?.nombre || '',
      'Remuneracion': round2(costos.remuneracion),
      'Asig. Familiar': round2(costos.asignacionFamiliar),
      'Total Rem.': round2(costos.totalRemuneracion),
      'Essalud': round2(costos.essalud),
      'CTS': round2(costos.ctsMensual),
      'Gratif.': round2(costos.gratificacionMensual),
      'Bonif. Ext.': round2(costos.bonifExtraordinariaMensual),
      'Costo Planilla': round2(costos.costoMensualPlanilla),
      'SCTR': round2(costos.sctr),
      'Vida Ley': round2(costos.vidaLey),
      'EMO': round2(costos.emo),
      'Honorarios': round2(costos.honorarios),
      'Total Mensual': round2(costos.totalMensual),
      'Email': e.user?.email || '',
      'Estado': e.activo ? 'Activo' : 'Inactivo'
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)

  const columnWidths = [
    { wch: 4 },  // N°
    { wch: 28 }, // Apellidos y Nombres
    { wch: 10 }, // DNI
    { wch: 12 }, // F. Ingreso
    { wch: 18 }, // Cargo
    { wch: 15 }, // Area
    { wch: 12 }, // Remuneracion
    { wch: 10 }, // Asig. Familiar
    { wch: 12 }, // Total Rem.
    { wch: 10 }, // Essalud
    { wch: 10 }, // CTS
    { wch: 10 }, // Gratif.
    { wch: 10 }, // Bonif. Ext.
    { wch: 14 }, // Costo Planilla
    { wch: 8 },  // SCTR
    { wch: 10 }, // Vida Ley
    { wch: 8 },  // EMO
    { wch: 12 }, // Honorarios
    { wch: 14 }, // Total Mensual
    { wch: 28 }, // Email
    { wch: 10 }, // Estado
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Personal')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `personal_costos_laborales_${timestamp}.xlsx`)
}

/**
 * Genera una plantilla Excel para importar empleados
 * Solo incluye campos editables (no los calculados)
 */
export function generarPlantillaEmpleados() {
  const ejemplos = [
    {
      'Email': 'juan@empresa.com',
      'Nombre': '(Se toma del usuario)',
      'DNI': '12345678',
      'Cargo': 'INGENIERO SENIOR A DE INGENIERÍA',
      'Departamento': 'PROYECTOS',
      'Remuneracion': 3500,
      'Asig. Familiar': 102.50,
      'Honorarios': 1500,
      'EMO': 25,
      'F. Ingreso': '01/01/2024',
      'Estado': 'Activo'
    },
    {
      'Email': 'maria@empresa.com',
      'Nombre': '(Se toma del usuario)',
      'DNI': '87654321',
      'Cargo': 'TÉCNICO SEMI SENIOR B DE CONSTRUCCION',
      'Departamento': 'SGI',
      'Remuneracion': 2000,
      'Asig. Familiar': 0,
      'Honorarios': 500,
      'EMO': 25,
      'F. Ingreso': '15/03/2024',
      'Estado': 'Activo'
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  const columnWidths = [
    { wch: 28 }, // Email
    { wch: 12 }, // DNI
    { wch: 20 }, // Cargo
    { wch: 18 }, // Departamento
    { wch: 14 }, // Remuneracion
    { wch: 12 }, // Asig. Familiar
    { wch: 12 }, // Honorarios
    { wch: 8 },  // EMO
    { wch: 12 }, // F. Ingreso
    { wch: 10 }, // Estado
  ]
  worksheet['!cols'] = columnWidths

  // Agregar nota de instrucciones
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados')

  // Crear hoja de instrucciones
  const instrucciones = [
    { 'Instrucciones para importar empleados': '' },
    { 'Instrucciones para importar empleados': '1. Email: OBLIGATORIO. Debe existir como usuario en el sistema.' },
    { 'Instrucciones para importar empleados': '2. Nombre: OPCIONAL. El nombre se toma automaticamente del usuario.' },
    { 'Instrucciones para importar empleados': '3. DNI: Documento de identidad del empleado.' },
    { 'Instrucciones para importar empleados': '4. Cargo: Debe coincidir EXACTAMENTE con los del catalogo (ej: INGENIERO SENIOR A DE INGENIERIA).' },
    { 'Instrucciones para importar empleados': '5. Departamento: Debe coincidir EXACTAMENTE con los del catalogo (ej: PROYECTOS, SGI, COMERCIAL).' },
    { 'Instrucciones para importar empleados': '6. Remuneracion: Sueldo base en planilla (PEN). Tambien acepta: Sueldo, Planilla, Sueldo Planilla.' },
    { 'Instrucciones para importar empleados': '7. Asig. Familiar: Asignacion familiar si aplica (10% RMV = ~102.50). Tambien acepta: Asignacion Familiar.' },
    { 'Instrucciones para importar empleados': '8. Honorarios: Sueldo por recibos de honorarios (PEN).' },
    { 'Instrucciones para importar empleados': '9. EMO: Costo mensual del Examen Medico Ocupacional (default: 25).' },
    { 'Instrucciones para importar empleados': '10. F. Ingreso: Fecha de ingreso en formato DD/MM/YYYY o YYYY-MM-DD.' },
    { 'Instrucciones para importar empleados': '11. Estado: Activo o Inactivo.' },
    { 'Instrucciones para importar empleados': '' },
    { 'Instrucciones para importar empleados': 'NOTA: Los costos (Essalud, CTS, Gratificacion, etc.) se calculan automaticamente.' },
    { 'Instrucciones para importar empleados': 'NOTA: Si el empleado ya existe (mismo email), se actualizara con los nuevos datos.' },
  ]
  const wsInstruc = XLSX.utils.json_to_sheet(instrucciones, { skipHeader: true })
  wsInstruc['!cols'] = [{ wch: 70 }]
  XLSX.utils.book_append_sheet(workbook, wsInstruc, 'Instrucciones')

  XLSX.writeFile(workbook, 'plantilla_empleados.xlsx')
}

/**
 * Normaliza un string para comparación (quita acentos, espacios extra, lowercase)
 */
function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita acentos
    .replace(/[^\w\s.]/g, '') // Quita caracteres especiales excepto puntos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // Quita TODOS los espacios para comparación más flexible
}

/**
 * Helper para obtener valor de columna con múltiples nombres posibles
 * Ahora hace búsqueda flexible (sin acentos, case insensitive)
 */
function getColumn(row: Record<string, any>, ...names: string[]): any {
  // Primero intenta búsqueda exacta
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== '') {
      return row[name]
    }
  }

  // Si no encuentra, intenta búsqueda normalizada (sin espacios ni acentos)
  const rowKeys = Object.keys(row)
  const normalizedNames = names.map(n => normalizeString(n))

  for (const key of rowKeys) {
    const normalizedKey = normalizeString(key)
    if (normalizedNames.includes(normalizedKey)) {
      if (row[key] !== undefined && row[key] !== '') {
        return row[key]
      }
    }
  }

  // Búsqueda parcial (si la columna contiene alguno de los nombres)
  for (const key of rowKeys) {
    const normalizedKey = normalizeString(key)
    for (const name of normalizedNames) {
      // Solo considera coincidencias de al menos 4 caracteres para evitar falsos positivos
      if (name.length >= 4 && (normalizedKey.includes(name) || name.includes(normalizedKey))) {
        if (row[key] !== undefined && row[key] !== '') {
          return row[key]
        }
      }
    }
  }

  // Última opción: buscar por las primeras letras (para casos como "Remunera..." truncado)
  for (const key of rowKeys) {
    const normalizedKey = normalizeString(key)
    for (const name of normalizedNames) {
      // Si el nombre tiene al menos 6 caracteres y las primeras 6 letras coinciden
      if (name.length >= 6 && normalizedKey.length >= 6) {
        if (normalizedKey.substring(0, 6) === name.substring(0, 6)) {
          if (row[key] !== undefined && row[key] !== '') {
            return row[key]
          }
        }
      }
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

  // Debug detallado de columnas
  if (json.length > 0) {
    const headers = Object.keys(json[0])
    console.log('📊 === IMPORTACIÓN DE EMPLEADOS ===')
    console.log('📊 Headers encontrados:', headers.length)
    headers.forEach((h, i) => {
      const normalized = normalizeString(h)
      const value = json[0][h]
      console.log(`  [${i}] "${h}" → normalizado: "${normalized}" → valor: ${value}`)
    })

    const testRow = json[0]
    console.log('📊 Test de lectura:')
    console.log('  - Remuneracion:', getColumn(testRow, 'Remuneracion', 'Remuneración', 'REMUNERACION', 'Sueldo Planilla', 'SueldoPlanilla', 'sueldo_planilla', 'Planilla', 'Sueldo', 'sueldo', 'SUELDO'))
    console.log('  - Asig.Familiar:', getColumn(testRow, 'Asig. Familiar', 'Asig.Familiar', 'AsigFamiliar', 'Asignacion Familiar', 'Asignación Familiar', 'AsignacionFamiliar', 'asignacion_familiar', 'ASIG. FAMILIAR', 'Asig Familiar'))
    console.log('  - Honorarios:', getColumn(testRow, 'Honorarios', 'honorarios', 'HONORARIOS', 'Sueldo Honorarios', 'SueldoHonorarios', 'sueldo_honorarios', 'Recibos'))
    console.log('  - Departamento:', getColumn(testRow, 'Departamento', 'departamento', 'DEPARTAMENTO', 'Depto', 'Area', 'area', 'Área', 'AREA'))
  }

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
    const fechaRaw = getColumn(row, 'F. Ingreso', 'Fecha Ingreso', 'FechaIngreso', 'fecha_ingreso', 'Fecha ingreso')
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

    const cargo = getColumn(row, 'Cargo', 'cargo', 'CARGO', 'Puesto', 'puesto')
    const departamento = getColumn(row, 'Departamento', 'departamento', 'DEPARTAMENTO', 'Depto', 'Area', 'area', 'Área', 'AREA')
    const sueldoPlanilla = getColumn(row, 'Remuneracion', 'Remuneración', 'REMUNERACION', 'Sueldo Planilla', 'SueldoPlanilla', 'sueldo_planilla', 'Planilla', 'Sueldo', 'sueldo', 'SUELDO')
    const sueldoHonorarios = getColumn(row, 'Honorarios', 'honorarios', 'HONORARIOS', 'Sueldo Honorarios', 'SueldoHonorarios', 'sueldo_honorarios', 'Recibos')
    const asignacionFamiliar = getColumn(row, 'Asig. Familiar', 'Asig.Familiar', 'AsigFamiliar', 'Asignacion Familiar', 'Asignación Familiar', 'AsignacionFamiliar', 'asignacion_familiar', 'ASIG. FAMILIAR', 'Asig Familiar')
    const emo = getColumn(row, 'EMO', 'emo', 'Emo', 'E.M.O.', 'ExamenMedico')
    const dni = getColumn(row, 'DNI', 'dni', 'Documento Identidad', 'DocumentoIdentidad', 'documento_identidad', 'Documento', 'DOC')
    const telefono = getColumn(row, 'Teléfono', 'Telefono', 'telefono', 'TELEFONO', 'Tel', 'Celular', 'celular')
    const direccion = getColumn(row, 'Dirección', 'Direccion', 'direccion', 'DIRECCION', 'Domicilio')
    const observaciones = getColumn(row, 'Observaciones', 'observaciones', 'OBSERVACIONES', 'Notas', 'Comentarios')

    return {
      email,
      cargo: cargo ? String(cargo).trim() || undefined : undefined,
      departamento: departamento ? String(departamento).trim() || undefined : undefined,
      sueldoPlanilla: sueldoPlanilla ? parseFloat(String(sueldoPlanilla)) || undefined : undefined,
      sueldoHonorarios: sueldoHonorarios ? parseFloat(String(sueldoHonorarios)) || undefined : undefined,
      asignacionFamiliar: asignacionFamiliar ? parseFloat(String(asignacionFamiliar)) || undefined : undefined,
      emo: emo ? parseFloat(String(emo)) || undefined : undefined,
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
