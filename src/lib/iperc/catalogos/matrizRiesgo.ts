export type NivelRiesgo = 'ALTO' | 'MEDIO' | 'BAJO'

export interface EvaluacionRiesgo {
  valor: number
  nivel: NivelRiesgo
}

// Severidad 1 (Catastrófica) → 5 (Insignificante)
// Probabilidad A (Común) → E (Prácticamente imposible)
export const MATRIZ_RIESGO: Record<string, EvaluacionRiesgo> = {
  '1A': { valor: 1,  nivel: 'ALTO'  },
  '1B': { valor: 2,  nivel: 'ALTO'  },
  '2A': { valor: 3,  nivel: 'ALTO'  },
  '1C': { valor: 4,  nivel: 'ALTO'  },
  '2B': { valor: 5,  nivel: 'ALTO'  },
  '3A': { valor: 6,  nivel: 'ALTO'  },
  '1D': { valor: 7,  nivel: 'ALTO'  },
  '2C': { valor: 8,  nivel: 'ALTO'  },
  '3B': { valor: 9,  nivel: 'MEDIO' },
  '4A': { valor: 10, nivel: 'MEDIO' },
  '1E': { valor: 11, nivel: 'MEDIO' },
  '2D': { valor: 12, nivel: 'MEDIO' },
  '3C': { valor: 13, nivel: 'MEDIO' },
  '4B': { valor: 14, nivel: 'MEDIO' },
  '5A': { valor: 15, nivel: 'MEDIO' },
  '2E': { valor: 16, nivel: 'BAJO'  },
  '3D': { valor: 17, nivel: 'BAJO'  },
  '4C': { valor: 18, nivel: 'BAJO'  },
  '5B': { valor: 19, nivel: 'BAJO'  },
  '3E': { valor: 20, nivel: 'BAJO'  },
  '4D': { valor: 21, nivel: 'BAJO'  },
  '5C': { valor: 22, nivel: 'BAJO'  },
  '4E': { valor: 23, nivel: 'BAJO'  },
  '5D': { valor: 24, nivel: 'BAJO'  },
  '5E': { valor: 25, nivel: 'BAJO'  },
}

export function evaluarRiesgo(severidad: number, probabilidad: string): EvaluacionRiesgo | null {
  return MATRIZ_RIESGO[`${severidad}${probabilidad}`] ?? null
}

export function formatearMatrizMarkdown(): string {
  return `# MATRIZ DE EVALUACIÓN DEL RIESGO (D.S. 024-2016-EM)

## Escalas
- **Severidad**: 1=Catastrófica, 2=Mortal, 3=Permanente, 4=Temporal, 5=Menor
- **Probabilidad**: A=Común, B=Ha sucedido, C=Podría suceder, D=Raro, E=Prácticamente imposible
- **Niveles**: valor 1-8=ALTO, 9-15=MEDIO, 16-25=BAJO

## Tabla (Severidad × Probabilidad → Valor: Nivel)

|   | A       | B       | C       | D       | E       |
|---|---------|---------|---------|---------|---------|
| 1 | 1:ALTO  | 2:ALTO  | 4:ALTO  | 7:ALTO  | 11:MEDIO|
| 2 | 3:ALTO  | 5:ALTO  | 8:ALTO  | 12:MEDIO| 16:BAJO |
| 3 | 6:ALTO  | 9:MEDIO | 13:MEDIO| 17:BAJO | 20:BAJO |
| 4 | 10:MEDIO| 14:MEDIO| 18:BAJO | 21:BAJO | 23:BAJO |
| 5 | 15:MEDIO| 19:BAJO | 22:BAJO | 24:BAJO | 25:BAJO |`.trim()
}
