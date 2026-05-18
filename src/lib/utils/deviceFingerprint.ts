export interface DeviceInfo {
  fingerprint: string
  userAgent: string
  plataforma: string
  modelo: string | null
  resolucion: string
}

const STORAGE_KEY = 'gys_device_id'

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
    return null
  }
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
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

  // ID estable generado una vez y persistido en localStorage.
  // A diferencia del fingerprint basado en UA/resolución, sobrevive actualizaciones
  // del browser y rotaciones de pantalla. Solo cambia si el usuario borra datos del browser.
  let fingerprint = localStorage.getItem(STORAGE_KEY)
  if (!fingerprint) {
    fingerprint = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, fingerprint)
  }

  return { fingerprint, userAgent: ua, plataforma, modelo, resolucion }
}
