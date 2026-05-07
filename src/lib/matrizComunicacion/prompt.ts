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

  return `Eres el Gestor de Proyectos de GYS CONTROL INDUSTRIAL SAC.
Genera la Matriz de Comunicaciones en formato GYS-GPR-MAC.

PROYECTO: ${data.proyecto.nombre}
CLIENTE: ${data.cliente}

PERSONAL DEL PROYECTO (una columna por persona en la matriz):
${data.personal.map(p =>
  `- Siglas: ${p.siglas} | Nombre: ${p.nombre} | Cargo: ${p.cargo}`
).join('\n')}

FILAS OBLIGATORIAS — USA EXACTAMENTE ESTOS NOMBRES, NO INVENTES OTROS:
${data.edts.map((e, i) => `${i + 1}. "${e.nombre}"`).join('\n')}

IMPORTANTE: El array "filas" del JSON debe tener EXACTAMENTE ${data.edts.length} objetos,
uno por cada EDT listado arriba, en el mismo orden.
El campo "edtNombre" debe ser EXACTAMENTE el nombre del EDT como está escrito arriba.

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

REGLAS CRÍTICAS:
1. Genera exactamente ${data.edts.length} filas — una por EDT
2. Cada fila debe tener exactamente ${data.personal.length} celdas
   (una por cada persona en el mismo orden que se listaron)
3. Los valores son combinaciones de letras: D, E, R, S, V, DV, DS,
   ER, SV, DR, ES — NO pongas "D" en todas las celdas, varía según cargo
4. Ninguna celda debe quedar vacía — mínimo "D" si no hay rol claro
5. No incluyas texto antes ni después del JSON

EJEMPLO OBLIGATORIO — así debe verse el JSON para un proyecto con
JM (Gerente), PR (Gestor), APH (Supervisor), YA (HSEQ):

{
  "filas": [
    {
      "orden": 1,
      "edtNombre": "Gestión",
      "frecuencia": "S",
      "medio": "E",
      "celdas": [
        { "siglas": "JM",  "valor": "DV" },
        { "siglas": "PR",  "valor": "E"  },
        { "siglas": "APH", "valor": "D"  },
        { "siglas": "YA",  "valor": "D"  }
      ]
    },
    {
      "orden": 2,
      "edtNombre": "Seguridad",
      "frecuencia": "E",
      "medio": "E",
      "celdas": [
        { "siglas": "JM",  "valor": "D"  },
        { "siglas": "PR",  "valor": "D"  },
        { "siglas": "APH", "valor": "D"  },
        { "siglas": "YA",  "valor": "E"  }
      ]
    },
    {
      "orden": 3,
      "edtNombre": "Construcción",
      "frecuencia": "E",
      "medio": "IE",
      "celdas": [
        { "siglas": "JM",  "valor": "DS" },
        { "siglas": "PR",  "valor": "R"  },
        { "siglas": "APH", "valor": "E"  },
        { "siglas": "YA",  "valor": "D"  }
      ]
    }
  ]
}

Aplica esta misma lógica para TODOS los EDTs del proyecto usando
las siglas reales: ${siglasList}
Responde ÚNICAMENTE con el JSON completo, sin texto adicional.`
}
