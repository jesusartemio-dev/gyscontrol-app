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

function detectarModelo(ua: string, plataforma: string): string | null {
  // Android: Chrome 110+ reduce el modelo a "K" por privacidad — ignorarlo
  const android = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\sBuild|\))/i)
  if (android) {
    const m = android[1].trim()
    if (m && m !== 'K') return m
    return null // se mostrará solo la plataforma
  }
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  // Desktop: mostrar navegador + versión
  const edge = ua.match(/Edg\/([\d]+)/i)
  if (edge) return `Edge ${edge[1]}`
  const firefox = ua.match(/Firefox\/([\d]+)/i)
  if (firefox) return `Firefox ${firefox[1]}`
  const chrome = ua.match(/Chrome\/([\d]+)/i)
  if (chrome) return `${plataforma} · Chrome ${chrome[1]}`
  const safari = ua.match(/Version\/([\d]+).*Safari/i)
  if (safari) return `Safari ${safari[1]}`
  return null
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const ua = navigator.userAgent
  const plataforma = detectarPlataforma(ua)

  // UA-CH: API moderna disponible en Chrome/Android que da el modelo real
  let modeloUaCh: string | null = null
  try {
    const nav = navigator as any
    if (nav.userAgentData?.getHighEntropyValues) {
      const hints = await nav.userAgentData.getHighEntropyValues(['model', 'platform'])
      if (hints.model && hints.model !== 'K' && hints.model !== '') {
        modeloUaCh = hints.model
      }
    }
  } catch {}

  const modelo = modeloUaCh || detectarModelo(ua, plataforma)
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
