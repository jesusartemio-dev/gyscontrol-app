export interface MatrizPromptData {
  proyecto: { nombre: string; codigo: string }
  cliente: string
  personal: Array<{
    siglas: string
    nombre: string
    empresa: string
    cargo: string
    celular: string
    correo: string
  }>
  edts: Array<{
    nombre: string
    fase: string
    orden: number
  }>
}

export interface CeldaIA {
  siglas: string
  valor: string
}

export interface MatrizFilaIA {
  orden: number
  edtNombre: string
  frecuencia: string
  medio: string
  celdas: CeldaIA[]
}

export function buildPromptMatriz(data: MatrizPromptData): string {
  const siglasList = data.personal.map(p => p.siglas).join(', ')
  const exampleSig0 = data.personal[0]?.siglas ?? 'P1'
  const exampleSig1 = data.personal[1]?.siglas ?? 'P2'

  return `Eres el Gestor de Proyectos de GYS CONTROL INDUSTRIAL SAC.
Genera la Matriz de Comunicaciones en formato GYS-GPR-MAC.

PROYECTO: ${data.proyecto.nombre}
CLIENTE: ${data.cliente}

PERSONAL DEL PROYECTO (una columna por persona en la matriz):
${data.personal.map(p =>
  `- Siglas: ${p.siglas} | Nombre: ${p.nombre} | Cargo: ${p.cargo}`
).join('\n')}

EDTs DEL CRONOGRAMA (una fila por EDT en la matriz):
${data.edts.map((e, i) =>
  `${i + 1}. ${e.nombre} (Fase: ${e.fase})`
).join('\n')}

FORMATO REQUERIDO — Ejemplo del documento real GYS-GPR-MAC:
ID | ACTIVIDAD    | FREC | MEDIO | ${siglasList}
1  | Comercial    | E    | E     | DV | DS | D | D | D | E
2  | Gestión      | S    | E     | D  | DV | E | D | D | D
3  | Seguridad    | E    | E     | D  | D  | D | D | E | D
8  | Construcción | E    | IE    | DR | DS | R | S | E | D

FRECUENCIA: M=Mensual S=Semanal E=Eventual
MEDIO: I=Informe M=Minuta E=Email R=Reunión P=Planilla IE=Informe+Email
RESPONSABILIDAD (combinar letras):
  D=Destinatario E=Emisor R=Autoriza S=Soporte V=Valida
  Ejemplos: DV=Destinatario+Valida DS=Destinatario+Soporte
            ER=Emisor+Autoriza SV=Soporte+Valida DR=Destinatario+Autoriza

CRITERIOS para asignar valores por cargo:
- Supervisor cliente externo: DV en técnico, DS en gestión
- Gerente de Proyectos: D en mayoría, DV en técnico
- Gestor de Proyecto: E en Gestión, R en Construcción/Comisionamiento
- Ing. Residente/Programador: ER en Ingeniería, R en técnico
- Cadista: DS en Ingeniería, R en Planos, E en Documentación
- Coord. Construcción: DS en Construcción, SV en campo
- Supervisor Proyecto: E en Construcción, ES en Comisionamiento
- Ing. Seguridad/HSEQ: E en Seguridad, D en resto
- Coord. Comercial: E en Comercial, D en resto

Responde ÚNICAMENTE con JSON válido sin texto adicional:

{
  "filas": [
    {
      "orden": 1,
      "edtNombre": "Comercial",
      "frecuencia": "E",
      "medio": "E",
      "celdas": [
        { "siglas": "${exampleSig0}", "valor": "DV" },
        { "siglas": "${exampleSig1}", "valor": "DS" }
      ]
    }
  ]
}

REGLAS CRÍTICAS:
1. Genera exactamente ${data.edts.length} filas — una por EDT
2. Cada fila debe tener exactamente ${data.personal.length} celdas
   (una por cada persona en el mismo orden que se listaron)
3. Los valores son combinaciones de letras: D, E, R, S, V, DV, DS,
   ER, SV, DR, ES (para medio usar también IE)
4. Ninguna celda debe quedar vacía — mínimo "D" si no hay rol claro
5. No incluyas texto antes ni después del JSON`
}
