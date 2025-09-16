/**
 * 🏢 GYS Cliente Code Generator
 * 
 * Generates automatic codes for clients following the pattern:
 * CLI-XXXX-YY where:
 * - CLI: Client constant code
 * - XXXX: Sequential number (incremental with leading zeros)
 * - YY: Last two digits of current year
 * 
 * Examples: CLI-0001-25, CLI-0002-25, CLI-0150-25
 */

import { prisma } from '@/lib/prisma'

// ✅ Client constant - can be configured via environment variable
const CLIENT_CODE = process.env.CLIENT_CODE || 'CLI'

/**
 * Generate next sequential number for client code
 * @returns Promise<number> Next sequential number
 */
export async function getNextClienteSequence(): Promise<number> {
  try {
    // 🔍 Get the last client ordered by numeroSecuencia descending
    const ultimoCliente = await prisma.cliente.findFirst({
      orderBy: { numeroSecuencia: 'desc' },
      select: { numeroSecuencia: true }
    })

    // 📈 Return next sequence number
    return ultimoCliente ? (ultimoCliente.numeroSecuencia ?? 0) + 1 : 1
  } catch (error) {
    console.error('❌ Error getting next client sequence:', error)
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
    const ultimoCliente = await prisma.cliente.findFirst({
      where: {
        codigo: {
          startsWith: `${CLIENT_CODE}-`
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { codigo: true }
    })

    if (ultimoCliente?.codigo) {
      // 🔍 Extract sequence number from pattern CLI-XXXX-YY
      const match = ultimoCliente.codigo.match(new RegExp(`^${CLIENT_CODE}-(\\d+)-\\d{2}$`))
      if (match) {
        return parseInt(match[1]) + 1
      }
    }

    return 1 // 🆕 First client
  } catch (error) {
    console.error('❌ Error in fallback sequence extraction:', error)
    return 1
  }
}

/**
 * Get current year's last two digits
 * @returns string Last two digits of current year (e.g., "25" for 2025)
 */
export function getCurrentYearSuffix(): string {
  const currentYear = new Date().getFullYear()
  return currentYear.toString().slice(-2)
}

/**
 * Generate complete client code
 * @param numeroSecuencia Sequential number
 * @returns string Complete code in format CLI-XXXX-YY
 */
export function generateClienteCode(numeroSecuencia: number): string {
  const yearSuffix = getCurrentYearSuffix()
  // ✅ Format sequence number with leading zeros (4 digits)
  const formattedSequence = numeroSecuencia.toString().padStart(4, '0')
  return `${CLIENT_CODE}-${formattedSequence}-${yearSuffix}`
}

/**
 * Generate next client code automatically
 * @returns Promise<{codigo: string, numeroSecuencia: number}>
 */
export async function generateNextClienteCode(): Promise<{
  codigo: string
  numeroSecuencia: number
}> {
  try {
    const numeroSecuencia = await getNextClienteSequence()
    const codigo = generateClienteCode(numeroSecuencia)
    
    console.log('✅ Generated client code:', { codigo, numeroSecuencia })
    return { codigo, numeroSecuencia }
  } catch (error) {
    console.error('❌ Error generating client code:', error)
    throw new Error('Failed to generate client code')
  }
}

/**
 * Validate client code format
 * @param codigo Client code to validate
 * @returns boolean True if valid format
 */
export function validateClienteCode(codigo: string): boolean {
  const pattern = new RegExp(`^${CLIENT_CODE}-\\d{4}-\\d{2}$`)
  return pattern.test(codigo)
}

/**
 * Parse client code into components
 * @param codigo Client code to parse
 * @returns Object with parsed components or null if invalid
 */
export function parseClienteCode(codigo: string): {
  clientCode: string
  numeroSecuencia: number
  year: string
} | null {
  const match = codigo.match(new RegExp(`^(${CLIENT_CODE})-(\\d{4})-(\\d{2})$`))
  if (!match) return null
  
  return {
    clientCode: match[1],
    numeroSecuencia: parseInt(match[2]),
    year: match[3]
  }
}