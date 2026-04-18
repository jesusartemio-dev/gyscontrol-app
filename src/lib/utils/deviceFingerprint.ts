export interface DeviceInfo {
  fingerprint: string
  userAgent: string
  plataforma: string
  modelo: string | null
  resolucion: string
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function detectarPlataforma(ua: string): string {
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/windows/i.test(ua)) return 'Windows'
  if (/macintosh|mac os x/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Desconocida'
}

function detectarModelo(ua: string): string | null {
  const android = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\sBuild|\))/i)
  if (android) return android[1].trim()
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  const chrome = ua.match(/Chrome\/([\d.]+)/i)
  if (chrome) return `Chrome ${chrome[1].split('.')[0]}`
  return null
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const ua = navigator.userAgent
  const plataforma = detectarPlataforma(ua)
  const modelo = detectarModelo(ua)
  const resolucion = `${screen.width}x${screen.height}`

  const raw = [
    ua,
    plataforma,
    resolucion,
    String(screen.colorDepth),
    String(screen.pixelDepth),
    String(navigator.hardwareConcurrency || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join('|')

  const fingerprint = await sha256(raw)

  return { fingerprint, userAgent: ua, plataforma, modelo, resolucion }
}
