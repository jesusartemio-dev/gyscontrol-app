import { prisma } from '@/lib/prisma'

// ── Tipos ────────────────────────────────────────────────

export interface SunatInfo {
  razonSocial: string
  estado: string
  condicion: string
  direccion: string
}

export interface SunatResult {
  sunat: SunatInfo | null
  sunatAlerta: string | null
  sunatAlertaTipo: 'warning' | 'info' | null
}

export interface ConsultaRucResult {
  nombre: string | null
  ruc: string
  direccion: string | null
  sunatVerificado: boolean
  source: 'local' | 'sunat' | null
  alerta: string | null
  alertaTipo: 'warning' | 'info' | null
}

// ── Consulta SUNAT vía Decolecta (apis.net.pe) ─────────

export async function consultarSunat(ruc: string): Promise<SunatResult> {
  const token = process.env.DECOLECTA_API_TOKEN
  if (!token) {
    return { sunat: null, sunatAlerta: 'No se pudo verificar RUC en SUNAT', sunatAlertaTipo: 'info' }
  }

  try {
    const res = await fetch(
      `https://api.decolecta.com/v1/sunat/ruc?numero=${ruc}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      console.warn(`Decolecta SUNAT error: HTTP ${res.status} for RUC ${ruc}`)
      return { sunat: null, sunatAlerta: 'No se pudo verificar RUC en SUNAT', sunatAlertaTipo: 'info' }
    }

    const data = await res.json()

    if (!data.razon_social) {
      return { sunat: null, sunatAlerta: 'RUC no encontrado en SUNAT', sunatAlertaTipo: 'info' }
    }

    const sunat: SunatInfo = {
      razonSocial: data.razon_social,
      estado: data.estado || '',
      condicion: data.condicion || '',
      direccion: data.direccion || '',
    }

    let sunatAlerta: string | null = null
    let sunatAlertaTipo: 'warning' | 'info' | null = null

    if (sunat.condicion && sunat.condicion !== 'HABIDO') {
      sunatAlerta = `Proveedor NO HABIDO (condición: ${sunat.condicion})`
      sunatAlertaTipo = 'warning'
    }
    if (sunat.estado && sunat.estado !== 'ACTIVO') {
      sunatAlerta = `Proveedor NO ACTIVO (estado: ${sunat.estado})${sunatAlerta ? `. ${sunatAlerta}` : ''}`
      sunatAlertaTipo = 'warning'
    }

    return { sunat, sunatAlerta, sunatAlertaTipo }
  } catch (error) {
    console.warn(`Decolecta SUNAT error for RUC ${ruc}:`, error instanceof Error ? error.message : error)
    return { sunat: null, sunatAlerta: 'No se pudo verificar RUC en SUNAT', sunatAlertaTipo: 'info' }
  }
}

// ── Consulta RUC: local primero, luego SUNAT ────────────

export async function consultarRuc(ruc: string): Promise<ConsultaRucResult> {
  // Validar formato
  if (!/^\d{11}$/.test(ruc)) {
    return { nombre: null, ruc, direccion: null, sunatVerificado: false, source: null, alerta: 'RUC debe tener 11 dígitos', alertaTipo: 'info' }
  }

  // 1. Buscar en tabla Proveedor local
  const proveedor = await prisma.proveedor.findFirst({
    where: { ruc },
    select: { nombre: true, ruc: true, direccion: true },
  })

  if (proveedor) {
    return {
      nombre: proveedor.nombre,
      ruc,
      direccion: proveedor.direccion || null,
      sunatVerificado: false,
      source: 'local',
      alerta: null,
      alertaTipo: null,
    }
  }

  // 2. Consultar SUNAT
  const { sunat, sunatAlerta, sunatAlertaTipo } = await consultarSunat(ruc)

  if (sunat) {
    return {
      nombre: sunat.razonSocial,
      ruc,
      direccion: sunat.direccion || null,
      sunatVerificado: true,
      source: 'sunat',
      alerta: sunatAlerta,
      alertaTipo: sunatAlertaTipo,
    }
  }

  return {
    nombre: null,
    ruc,
    direccion: null,
    sunatVerificado: false,
    source: null,
    alerta: sunatAlerta || 'RUC no encontrado',
    alertaTipo: sunatAlertaTipo || 'info',
  }
}
