import { createHmac, randomBytes } from 'crypto'

const STEP_SECONDS = 30
const TOLERANCE_STEPS = 2

export function generarSecret(bytes = 24): string {
  return randomBytes(bytes).toString('base64url')
}

function stepActual(fecha = new Date()): number {
  return Math.floor(fecha.getTime() / 1000 / STEP_SECONDS)
}

function firmar(secret: string, step: number, contextoId: string): string {
  const h = createHmac('sha256', secret)
  h.update(`${contextoId}:${step}`)
  return h.digest('base64url').slice(0, 16)
}

export function generarQrDinamico(secret: string, contextoId: string): {
  token: string
  expiraEn: number
} {
  const step = stepActual()
  const token = firmar(secret, step, contextoId)
  const expiraEn = (step + 1) * STEP_SECONDS * 1000
  return { token, expiraEn }
}

export function validarQrDinamico(
  secret: string,
  contextoId: string,
  token: string,
): boolean {
  const step = stepActual()
  for (let offset = -TOLERANCE_STEPS; offset <= TOLERANCE_STEPS; offset++) {
    if (firmar(secret, step + offset, contextoId) === token) return true
  }
  return false
}

export function generarQrEstatico(secret: string, ubicacionId: string): string {
  const h = createHmac('sha256', secret)
  h.update(`estatico:${ubicacionId}`)
  const firma = h.digest('base64url').slice(0, 20)
  return `${ubicacionId}.${firma}`
}

export function validarQrEstatico(secret: string, token: string): string | null {
  const [ubicacionId, firma] = token.split('.')
  if (!ubicacionId || !firma) return null
  const h = createHmac('sha256', secret)
  h.update(`estatico:${ubicacionId}`)
  const esperado = h.digest('base64url').slice(0, 20)
  return esperado === firma ? ubicacionId : null
}

export function parsearPayloadQr(raw: string): {
  tipo: 'estatico' | 'supervisor'
  payload: string
} | null {
  if (raw.startsWith('GYS-EST:')) return { tipo: 'estatico', payload: raw.slice(8) }
  if (raw.startsWith('GYS-SUP:')) return { tipo: 'supervisor', payload: raw.slice(8) }
  return null
}

export function construirPayloadQrEstatico(token: string): string {
  return `GYS-EST:${token}`
}

export function construirPayloadQrSupervisor(jornadaId: string, token: string): string {
  return `GYS-SUP:${jornadaId}.${token}`
}
