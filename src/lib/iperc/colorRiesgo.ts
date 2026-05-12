import type { NivelRiesgo } from '@/lib/iperc/catalogos/matrizRiesgo'

export function badgeNivelRiesgo(nivel: NivelRiesgo): string {
  switch (nivel) {
    case 'ALTO':  return 'bg-red-500 text-white'
    case 'MEDIO': return 'bg-yellow-500 text-black'
    case 'BAJO':  return 'bg-green-500 text-white'
  }
}

export function textNivelRiesgo(nivel: NivelRiesgo): string {
  switch (nivel) {
    case 'ALTO':  return 'text-red-600 font-semibold'
    case 'MEDIO': return 'text-yellow-600 font-semibold'
    case 'BAJO':  return 'text-green-600 font-semibold'
  }
}
