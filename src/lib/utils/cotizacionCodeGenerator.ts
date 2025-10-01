/**
 * 🏢 GYS Cotización Code Generator
 * 
 * Generates automatic codes for quotations following the pattern:
 * GYS-XXXX-YY where:
 * - GYS: Company constant code
 * - XXXX: Sequential number (incremental)
 * - YY: Last two digits of current year
 * 
 * Examples: GYS-3621-21, GYS-4177-24, GYS-4251-25
 */

import { prisma } from '@/lib/prisma'

// ✅ Company constant - can be configured via environment variable
const COMPANY_CODE = process.env.COMPANY_CODE || 'GYS'

/**
 * Generate next sequential number for cotization code
 * @returns Promise<number> Next sequential number
 */
export async function getNextCotizacionSequence(): Promise<number> {
  try {
    // 🔍 Get the last cotization ordered by numeroSecuencia descending
    const ultimaCotizacion = await prisma.cotizacion.findFirst({
      orderBy: { numeroSecuencia: 'desc' },
      select: { numeroSecuencia: true }
    })

    // 📈 Return next sequence number
    return ultimaCotizacion ? ultimaCotizacion.numeroSecuencia + 1 : 1
  } catch (error) {
    console.error('❌ Error getting next cotization sequence:', error)
    // 🔄 Fallback: try to extract from codigo pattern
    return await getSequenceFromCodigoPattern()
  }
}

/**
 * Fallback method: Extract sequence from codigo pattern
 * @returns Promise<number> Next sequential number
 */
async function getSequenceFromCodigoPattern(): Promise<number> {
  try {
    const ultimaCotizacion = await prisma.cotizacion.findFirst({
      where: {
        codigo: {
          startsWith: `${COMPANY_CODE}-`
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { codigo: true }
    })

    if (ultimaCotizacion?.codigo) {
      // 🔍 Extract sequence number from pattern GYS-XXXX-YY
      const match = ultimaCotizacion.codigo.match(new RegExp(`^${COMPANY_CODE}-(\\d+)-\\d{2}$`))
      if (match) {
        return parseInt(match[1]) + 1
      }
    }

    return 1 // 🆕 First cotization
  } catch (error) {
    console.error('❌ Error in fallback sequence extraction:', error)
    return 1
  }
}

/**
 * Get current year's last two digits
 * @returns string Last two digits of current year (e.g., "24" for 2024)
 */
export function getCurrentYearSuffix(): string {
  const currentYear = new Date().getFullYear()
  return currentYear.toString().slice(-2)
}

/**
 * Generate complete cotization code
 * @param numeroSecuencia Sequential number
 * @returns string Complete code in format GYS-XXXX-YY
 */
export function generateCotizacionCode(numeroSecuencia: number): string {
  const yearSuffix = getCurrentYearSuffix()
  // ✅ Format sequence number with leading zeros (4 digits)
  const formattedSequence = numeroSecuencia.toString().padStart(4, '0')
  return `${COMPANY_CODE}-${formattedSequence}-${yearSuffix}`
}

/**
 * Generate next cotization code automatically
 * @returns Promise<{codigo: string, numeroSecuencia: number}>
 */
export async function generateNextCotizacionCode(): Promise<{
  codigo: string
  numeroSecuencia: number
}> {
  try {
    const numeroSecuencia = await getNextCotizacionSequence()
    const codigo = generateCotizacionCode(numeroSecuencia)
    
    return { codigo, numeroSecuencia }
  } catch (error) {
    console.error('❌ Error generating cotization code:', error)
    throw new Error('Failed to generate cotization code')
  }
}

/**
 * Validate cotization code format
 * @param codigo Code to validate
 * @returns boolean True if code matches expected pattern
 */
export function validateCotizacionCode(codigo: string): boolean {
  const pattern = new RegExp(`^${COMPANY_CODE}-\\d+-\\d{2}$`)
  return pattern.test(codigo)
}

/**
 * Extract components from cotization code
 * @param codigo Complete cotization code
 * @returns object with extracted components or null if invalid
 */
export function parseCotizacionCode(codigo: string): {
  companyCode: string
  numeroSecuencia: number
  year: string
} | null {
  const match = codigo.match(new RegExp(`^(${COMPANY_CODE})-(\\d+)-(\\d{2})$`))
  
  if (match) {
    return {
      companyCode: match[1],
      numeroSecuencia: parseInt(match[2]),
      year: match[3]
    }
  }
  
  return null
}
