# OUTPUT_YAN01.md — Plan de Trabajo generado con IA

> Proyecto: **YAN01 — Migración de Horno, Minera Yanacocha**
> Generado: 2026-05-09T05:34:55Z | Duración: ~186s (Haiku 30s + Sonnet 156s)
> Costo estimado: **$0.20 USD** (Haiku $0.019 + Sonnet $0.181)

---

## Cabecera del documento

| Campo | Valor |
|-------|-------|
| `id` | cmoxwp7xw0001l82k9icug17j |
| `codigoDocumento` | PT-YAN01-GYS-001 |
| `numeroRevision` | A |
| `tipoEmision` | B - Para Revisión |
| `generadoConIA` | true |
| `fechaGeneracionIA` | 2026-05-09T05:34:55.648Z |
| `completitud` | **12/12** (100%) |

### bloquesCompletitud

```json
{
  "objetivo": true,
  "alcanceGeneral": true,
  "alcanceDetallado": true,
  "eppRequeridos": true,
  "herramientasYEquipos": true,
  "restricciones": true,
  "personalAsignado": true,
  "matrizRaci": true,
  "histogramas": true,
  "cronogramaResumen": true,
  "responsabilidades": true,
  "referencias": true
}
```

---

## Sección 1 — Objetivo

> Texto libre (string). Longitud: 618 caracteres.

Ejecutar la migración del sistema de control del horno de Minera Yanacocha mediante el desarrollo de ingeniería de detalle, programación de controladores lógicos programables (PLC), diseño de interfaces hombre-máquina (HMI) y elaboración de planos eléctricos, garantizando la continuidad operativa y el cumplimiento de estándares de automatización industrial. El proyecto comprende la configuración de hardware de control multipatrón (Siemens S7-300, Allen-Bradley ControlLogix/CompactLogix, Omron NX1P2), programación de lógicas de mapeo de I/Os y variadores VFD, y desarrollo de documentación técnica as-built para operación y mantenimiento.

---

## Sección 2 — Alcance General

> Texto libre (string). Longitud: 1,507 caracteres.

GYS CONTROL INDUSTRIAL SAC ejecutará los servicios de ingeniería de automatización para el proyecto 'Migración de Horno' de MINERA YANACOCHA (RUC 20100070958), código interno YAN01, con un plazo de ejecución desde el 27 de enero hasta el 8 de abril de 2026 (71 días calendario). El alcance contractual comprende 76 horas de ingeniería distribuidas en tres entregables principales: desarrollo de pantallas HMI (18 horas), programación de PLC (36 horas) y elaboración de planos CAD (22 horas).

La ejecución del proyecto se realizará bajo la gestión de Jesús Mamani como Gestor de Proyecto, con Ángel Palomino como Residente e Ingeniero Programador líder, y supervisión SSOMA a cargo de Alonso Piscoya. El proyecto se desarrollará en las instalaciones de Minera Yanacocha en Cajamarca, con fase de ingeniería remota y fase de implementación en sitio según cronograma establecido.

El presente plan de trabajo detalla las actividades de la fase de INGENIERÍA, que constituye el núcleo del alcance cotizado. Las fases de PROCURA, EJECUCIÓN y CIERRE requerirán planes complementarios una vez confirmada la orden de compra y contrato formal. El proyecto contempla la integración de equipos de control de múltiples fabricantes (Siemens, Allen-Bradley, Omron) y variadores VFD (WEG, Mitsubishi, INVT) totalizando 8.4 kW de potencia instalada.

La cotización actual no incluye partidas de implementación física en sitio (andamios, manlift, EPP especializado, viáticos, permisos de trabajo en altura), las cuales deberán presupuestarse según evaluación de campo y matriz IPERC específica del emplazamiento del horno. Se requiere gestión inmediata para formalización contractual (orden de compra y contrato no disponibles a la fecha).

---

## Sección 3 — Alcance Detallado

> Array de 9 ítems. Schema: `planAlcanceItemSchema`.

```json
[
  {
    "numero": "11.1",
    "nombre": "Desarrollo de Pantillas HMI - Instrumentos Analógicos",
    "ubicacion": "Ingeniería remota - Oficinas GYS",
    "descripcion": "Desarrollo de interfaz gráfica HMI para lectura, visualización y configuración de variables analógicas del proceso (temperatura, presión, flujo, nivel). Incluye diseño de faceplates con indicadores numéricos, gráficos de tendencia histórica, alarmas configurables y navegación intuitiva. La plantilla será reutilizable para múltiples lazos analógicos y cumplirá estándares ISA-101 de diseño de interfaces. Se entregará código fuente editable y documentación de configuración.",
    "edtRefId": "bfdda5f1-c0eb-4d12-9f36-13fcce6d0448",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": false,
    "tieneRiesgoElectrico": false,
    "tieneRiesgoEspacioConfinado": false
  },
  {
    "numero": "11.2",
    "nombre": "Desarrollo de Pantillas HMI - Motores Eléctricos",
    "ubicacion": "Ingeniería remota - Oficinas GYS",
    "descripcion": "Desarrollo de pantalla HMI para control y monitoreo de motores eléctricos con visualización de estado operativo (marcha/paro/falla), comandos de arranque/paro local y remoto, indicadores de corriente y potencia, contador de horas de operación y registro de eventos. La interfaz incluirá animaciones dinámicas de estado, códigos de color según normativa y botones de comando con confirmación. Se aplicará para motores con arranque directo DOL y arrancadores suaves.",
    "edtRefId": "bfdda5f1-c0eb-4d12-9f36-13fcce6d0448",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": false,
    "tieneRiesgoElectrico": false,
    "tieneRiesgoEspacioConfinado": false
  },
  {
    "numero": "11.3",
    "nombre": "Desarrollo de Pantillas HMI - Variadores VFD",
    "ubicacion": "Ingeniería remota - Oficinas GYS",
    "descripcion": "Desarrollo de pantalla HMI para control y parametrización de variadores de frecuencia (VFD) con visualización de velocidad actual y setpoint, frecuencia de salida, corriente y voltaje, modo de operación (local/remoto/automático), y acceso a parámetros configurables. La interfaz permitirá ajuste de velocidad mediante slider, inicio/paro, cambio de sentido de giro y visualización de alarmas y fallas del drive. Compatible con protocolos Modbus RTU/TCP para integración con PLCs Siemens, Allen-Bradley y Omron.",
    "edtRefId": "bfdda5f1-c0eb-4d12-9f36-13fcce6d0448",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": false,
    "tieneRiesgoElectrico": false,
    "tieneRiesgoEspacioConfinado": false
  },
  {
    "numero": "11.4",
    "nombre": "Configuración de Hardware y Comunicación PLC",
    "ubicacion": "Ingeniería remota - Oficinas GYS / Sala de control Minera Yanacocha",
    "descripcion": "Configuración de hardware de controladores lógicos programables multipatrón: Siemens S7-300 314C (PROFIBUS/PROFINET), Allen-Bradley ControlLogix y CompactLogix L30ER (EtherNet/IP), y Omron NX1P2 (EtherCAT/Ethernet). Incluye configuración de CPU, módulos de entrada/salida digitales y analógicas, módulos de comunicación, direccionamiento IP, parámetros de red industrial, y configuración de redundancia cuando aplique.",
    "edtRefId": "266cb07d-48c7-4670-ba26-61c159cf34bc",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": false,
    "tieneRiesgoElectrico": true,
    "tieneRiesgoEspacioConfinado": false
  },
  {
    "numero": "11.5",
    "nombre": "Programación de Lógica de Mapeo de I/Os (PLC-IOs)",
    "ubicacion": "Ingeniería remota - Oficinas GYS",
    "descripcion": "Desarrollo de programación de mapeo de entradas y salidas digitales y analógicas en los controladores PLC para integración de campo con sensores, transmisores, actuadores y elementos finales de control del horno. Incluye asignación de direcciones físicas, escalamiento de señales analógicas 4-20mA y 0-10V, configuración de filtros digitales, detección de fallas de señal, y lógica de interlock de seguridad.",
    "edtRefId": "266cb07d-48c7-4670-ba26-61c159cf34bc",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": false,
    "tieneRiesgoElectrico": false,
    "tieneRiesgoEspacioConfinado": false
  },
  {
    "numero": "11.6",
    "nombre": "Programación de Lógica de Mapeo de Variadores (PLC-DRV)",
    "ubicacion": "Ingeniería remota - Oficinas GYS",
    "descripcion": "Desarrollo de programación de control y comunicación entre PLCs y variadores de frecuencia (WEG CFW300 2.2kW, Mitsubishi FR-E800 2.2kW, INVT GD20 4kW) mediante redes industriales Modbus RTU/TCP y/o protocolos propietarios. Incluye configuración de telegrams de control y monitoreo, comandos de arranque/paro, ajuste de velocidad, lectura de variables operativas, gestión de alarmas y fallas, y lógica de rampa de aceleración/desaceleración.",
    "edtRefId": "266cb07d-48c7-4670-ba26-61c159cf34bc",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": true,
    "tieneRiesgoElectrico": true,
    "tieneRiesgoEspacioConfinado": false
  },
  {
    "numero": "11.7",
    "nombre": "Elaboración de Diagrama Unifilar Eléctrico",
    "ubicacion": "Ingeniería remota - Oficinas GYS",
    "descripcion": "Desarrollo de diagrama unifilar de potencia del sistema eléctrico del horno, representando acometida principal, tableros de distribución, dispositivos de protección (interruptores termomagnéticos, contactores, relés térmicos), alimentación a variadores VFD y motores, y sistemas de tierras. Cumplirá CNE 2011, normas IEC 60617 de simbología, e incluirá cálculos de cortocircuito y coordinación de protecciones. Se entregará en formato CAD editable (DWG) y PDF.",
    "edtRefId": "4613ef85-bfb5-43b3-ae1b-bb919ccffd4a",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": false,
    "tieneRiesgoElectrico": false,
    "tieneRiesgoEspacioConfinado": false
  },
  {
    "numero": "11.8",
    "nombre": "Elaboración de Planos de Distribución Eléctrica",
    "ubicacion": "Ingeniería remota - Oficinas GYS",
    "descripcion": "Desarrollo de planos de distribución y circuitería eléctrica general del sistema de control y potencia del horno, incluyendo layout de tableros, ruteo de bandejas portacables, canalización de conductores, cajas de paso y conexionado de equipos. Los planos mostrarán distribución física en planta, elevaciones, detalles de montaje, especificaciones de materiales y lista de cables con origen-destino.",
    "edtRefId": "4613ef85-bfb5-43b3-ae1b-bb919ccffd4a",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": false,
    "tieneRiesgoElectrico": false,
    "tieneRiesgoEspacioConfinado": false
  },
  {
    "numero": "11.9",
    "nombre": "Elaboración de Planos de Arranque Directo (DOL)",
    "ubicacion": "Ingeniería remota - Oficinas GYS",
    "descripcion": "Desarrollo de planos de control y potencia para arranque directo de motores (Direct On Line - DOL), incluyendo diagramas de fuerza con contactores, protección termomagnética y relés térmicos, y diagramas de control con botoneras, selectores, pilotos de señalización y lógica de interlock. Los planos incluirán especificaciones técnicas de componentes, calibración de protecciones, secuencias de operación y listado de materiales.",
    "edtRefId": "4613ef85-bfb5-43b3-ae1b-bb919ccffd4a",
    "servicioCotizadoRefId": "",
    "tieneRiesgoAltura": false,
    "tieneRiesgoCaliente": false,
    "tieneRiesgoElectrico": false,
    "tieneRiesgoEspacioConfinado": false
  }
]
```

---

## Sección 4 — EPP Requeridos

> Objeto con 3 categorías. Total: 6 básico + 2 bioseguridad + 5 riesgo específico = **13 ítems**.

```json
{
  "basico": [
    { "nombre": "Casco de seguridad clase E", "norma": "ANSI Z89.1-2014 Tipo I Clase E", "observaciones": "Uso obligatorio en áreas operativas y sala de control" },
    { "nombre": "Lentes de seguridad con protección lateral", "norma": "ANSI Z87.1+ (impacto de alta velocidad)", "observaciones": "Uso permanente en áreas de trabajo" },
    { "nombre": "Zapatos dieléctricos de seguridad", "norma": "ASTM F2413-18", "observaciones": "Puntera de acero, suela dieléctrica, resistencia mínima 14 kV" },
    { "nombre": "Guantes de cuero tipo ingeniero", "norma": "", "observaciones": "Para manipulación de herramientas y equipos" },
    { "nombre": "Chaleco reflectivo con cinta de alta visibilidad", "norma": "ANSI/ISEA 107-2015 Clase 2", "observaciones": "Uso permanente en instalaciones mineras" },
    { "nombre": "Ropa de trabajo 100% algodón", "norma": "", "observaciones": "Camisa manga larga y pantalón, resistente a llama" }
  ],
  "bioseguridad": [
    { "nombre": "Mascarilla KN95", "norma": "GB2626-2006", "observaciones": "Para trabajos en ambientes con material particulado" },
    { "nombre": "Alcohol en gel 70%", "norma": "", "observaciones": "Desinfección de manos, disponible en puntos de trabajo" }
  ],
  "riesgoEspecifico": [
    { "nombre": "Guantes dieléctricos clase 00", "norma": "ASTM D120 Clase 00 (500V AC / 750V DC)", "observaciones": "Para trabajos en tableros eléctricos energizados hasta 500V" },
    { "nombre": "Guantes dieléctricos clase 0", "norma": "ASTM D120 Clase 0 (1000V AC / 1500V DC)", "observaciones": "Para trabajos eléctricos con tensión superior a 500V" },
    { "nombre": "Manga de cuero para soldadura", "norma": "", "observaciones": "Protección de brazos en trabajos de corte y soldadura" },
    { "nombre": "Careta facial con visor policarbonato", "norma": "ANSI Z87.1", "observaciones": "Protección contra arco eléctrico y proyección de partículas" },
    { "nombre": "Respirador de media cara con filtros P100", "norma": "NIOSH 42 CFR 84", "observaciones": "Para ambientes con polvo, humos metálicos o gases" }
  ]
}
```

---

## Sección 5 — Herramientas y Equipos

> 3 subcategorías: 7 equipos + 9 materiales + 9 herramientas = **25 ítems**.

```json
{
  "equipos": [
    { "nombre": "Laptop de programación con software PLC (TIA Portal, RSLogix, CX-One)", "unidad": "und", "cantidad": 2, "observaciones": "Una para Siemens, otra para Allen-Bradley/Omron" },
    { "nombre": "Multímetro digital True RMS", "unidad": "und", "cantidad": 2, "observaciones": "Medición de voltaje, corriente, resistencia, continuidad" },
    { "nombre": "Pinza amperimétrica True RMS", "unidad": "und", "cantidad": 1, "observaciones": "Medición de corriente sin interrumpir circuito" },
    { "nombre": "Fuente de alimentación DC regulable 0-24V", "unidad": "und", "cantidad": 1, "observaciones": "Para pruebas de módulos PLC y señales analógicas" },
    { "nombre": "Simulador de señales 4-20mA", "unidad": "und", "cantidad": 1, "observaciones": "Pruebas de lazos analógicos" },
    { "nombre": "Crimpeadora para terminales eléctricos", "unidad": "und", "cantidad": 1, "observaciones": "Armado de cables de instrumentación y potencia" },
    { "nombre": "Probador de continuidad y aislamiento (megóhmetro)", "unidad": "und", "cantidad": 1, "observaciones": "Verificación de aislamiento de cables y tierras" }
  ],
  "materiales": [
    { "nombre": "Terminales tipo punta para cable AWG 14-22", "unidad": "und", "cantidad": 500, "observaciones": "Conexionado en borneras de PLC y tableros" },
    { "nombre": "Cintillos plásticos negros 200mm", "unidad": "und", "cantidad": 200, "observaciones": "Sujeción de cables" },
    { "nombre": "Cinta aislante 3M Temflex 1700", "unidad": "rollo", "cantidad": 10, "observaciones": "Aislamiento eléctrico" },
    { "nombre": "Etiquetas autoadhesivas para identificación de cables", "unidad": "und", "cantidad": 500, "observaciones": "Rotulado según estándares cliente" },
    { "nombre": "Cable de red Ethernet CAT6 UTP", "unidad": "m", "cantidad": 100, "observaciones": "Comunicación entre PLCs y HMI" },
    { "nombre": "Cable multiconductor apantallado 18 AWG x 4 pares", "unidad": "m", "cantidad": 50, "observaciones": "Señales analógicas 4-20mA" },
    { "nombre": "Riel DIN 35mm", "unidad": "m", "cantidad": 10, "observaciones": "Montaje de módulos PLC y accesorios" },
    { "nombre": "Borneras de paso 4mm² para riel DIN", "unidad": "und", "cantidad": 50, "observaciones": "Distribución de señales" },
    { "nombre": "Fusibles 5x20mm de 1A, 2A, 5A, 10A", "unidad": "und", "cantidad": 20, "observaciones": "Protección de circuitos de control" }
  ],
  "herramientas": [
    { "nombre": "Juego de destornilladores planos y estrella", "unidad": "juego", "cantidad": 2, "observaciones": "Tamaños variados para borneras y equipos" },
    { "nombre": "Juego de destornilladores Torx", "unidad": "juego", "cantidad": 1, "observaciones": "Para equipos Siemens y Allen-Bradley" },
    { "nombre": "Juego de llaves Allen métricas", "unidad": "juego", "cantidad": 1, "observaciones": "Montaje de equipos en riel DIN" },
    { "nombre": "Alicate de corte diagonal", "unidad": "und", "cantidad": 2, "observaciones": "Corte de conductores" },
    { "nombre": "Alicate de punta", "unidad": "und", "cantidad": 2, "observaciones": "Manipulación de cables en borneras" },
    { "nombre": "Pela cables ajustable", "unidad": "und", "cantidad": 2, "observaciones": "Pelado de conductores 12-24 AWG" },
    { "nombre": "Wincha metálica 5m", "unidad": "und", "cantidad": 1, "observaciones": "Mediciones de campo" },
    { "nombre": "Nivel de burbuja magnético", "unidad": "und", "cantidad": 1, "observaciones": "Nivelación de tableros y equipos" },
    { "nombre": "Linterna frontal LED", "unidad": "und", "cantidad": 2, "observaciones": "Iluminación en tableros y espacios reducidos" }
  ]
}
```

---

## Sección 6 — Restricciones

> Array de 15 ítems. Categorías: AUTORIZACION(1) CAPACITACION(3) EPP(1) ELECTRICO(5) ALCOHOL_DROGAS(1) GENERAL(4).

```json
[
  { "categoria": "AUTORIZACION",    "texto": "Todo trabajo deberá contar con Permiso de Trabajo autorizado por Minera Yanacocha antes del inicio de actividades" },
  { "categoria": "CAPACITACION",   "texto": "El personal debe presentar certificado de aptitud médica ocupacional vigente para trabajo en minería" },
  { "categoria": "EPP",            "texto": "Es obligatorio el uso permanente de EPP básico completo en todas las áreas de la mina" },
  { "categoria": "ELECTRICO",      "texto": "Los trabajos eléctricos en tableros energizados requieren bloqueo y etiquetado LOTO (Lockout-Tagout)" },
  { "categoria": "ELECTRICO",      "texto": "Se prohíbe intervenir equipos energizados sin guantes dieléctricos clase 00 como mínimo" },
  { "categoria": "CAPACITACION",   "texto": "Todo trabajo eléctrico debe ser ejecutado por personal certificado en trabajos eléctricos según RM 111-2013-MEM/DM" },
  { "categoria": "ALCOHOL_DROGAS", "texto": "Está prohibido el ingreso de personal bajo efectos de alcohol o drogas, sujeto a pruebas aleatorias" },
  { "categoria": "CAPACITACION",   "texto": "El personal debe participar en charla de inducción y capacitación específica del cliente antes del inicio" },
  { "categoria": "GENERAL",        "texto": "Los trabajos en tableros de control requieren análisis de riesgo (ATS) previo y aprobado" },
  { "categoria": "GENERAL",        "texto": "Se debe mantener distancia mínima de seguridad de equipos en caliente (horno) según temperatura superficial" },
  { "categoria": "ELECTRICO",      "texto": "Los cables y herramientas eléctricas deben estar en buen estado y verificarse antes de uso" },
  { "categoria": "ELECTRICO",      "texto": "Está prohibido improvisar conexiones eléctricas o modificar sistemas sin autorización de ingeniería" },
  { "categoria": "GENERAL",        "texto": "Se debe reportar inmediatamente cualquier condición insegura o incidente al supervisor SSOMA" },
  { "categoria": "GENERAL",        "texto": "El área de trabajo debe mantenerse limpia, ordenada y libre de obstáculos durante y al finalizar labores" },
  { "categoria": "ELECTRICO",      "texto": "No se permite el uso de teléfonos móviles durante trabajos eléctricos o en áreas clasificadas" }
]
```

---

## Sección 7 — Personal Asignado

> Array de 4 personas.

```json
[
  {
    "nombre": "Jesús Mamani",
    "siglas": "JM",
    "cargo": "Gerente de Proyectos / Gestor de Proyecto",
    "empresa": "GYS CONTROL INDUSTRIAL SAC",
    "email": "jesus.m@gyscontrol.com",
    "telefono": "",
    "cip": "",
    "proyectoOrgNodoRefId": ""
  },
  {
    "nombre": "Ángel Palomino",
    "siglas": "AP",
    "cargo": "Residente / Ingeniero Programador",
    "empresa": "GYS CONTROL INDUSTRIAL SAC",
    "email": "angel.p@gyscontrol.com",
    "telefono": "9999999",
    "cip": "",
    "proyectoOrgNodoRefId": ""
  },
  {
    "nombre": "Alonso Piscoya",
    "siglas": "APS",
    "cargo": "Supervisor de Seguridad HSEQ",
    "empresa": "GYS CONTROL INDUSTRIAL SAC",
    "email": "alonso.p@gyscontrol.com",
    "telefono": "+51 950307588",
    "cip": "3234234234",
    "proyectoOrgNodoRefId": ""
  },
  {
    "nombre": "Yony Apaza",
    "siglas": "YA",
    "cargo": "Jefe HSEQ",
    "empresa": "GYS CONTROL INDUSTRIAL SAC",
    "email": "yony.a@gyscontrol.com",
    "telefono": "",
    "cip": "",
    "proyectoOrgNodoRefId": ""
  }
]
```

---

## Sección 8 — Matriz RACI

> Objeto con array `filas`. 3 filas (nivel EDT), 4 participantes.

```json
{
  "filas": [
    {
      "edt": "HMI - Desarrollo de Pantallas",
      "asignaciones": [
        { "siglas": "JM",  "rol": "A" },
        { "siglas": "AP",  "rol": "R" },
        { "siglas": "APS", "rol": "C" },
        { "siglas": "YA",  "rol": "I" }
      ]
    },
    {
      "edt": "PLC - Programación y Configuración",
      "asignaciones": [
        { "siglas": "JM",  "rol": "A" },
        { "siglas": "AP",  "rol": "R" },
        { "siglas": "APS", "rol": "C" },
        { "siglas": "YA",  "rol": "I" }
      ]
    },
    {
      "edt": "CAD - Desarrollo de Planos",
      "asignaciones": [
        { "siglas": "JM",  "rol": "A" },
        { "siglas": "AP",  "rol": "R" },
        { "siglas": "APS", "rol": "I" },
        { "siglas": "YA",  "rol": "I" }
      ]
    }
  ]
}
```

**Tabla legible:**

| EDT | JM | AP | APS | YA |
|-----|----|----|-----|----|
| HMI - Desarrollo de Pantallas | **A** | **R** | C | I |
| PLC - Programación y Configuración | **A** | **R** | C | I |
| CAD - Desarrollo de Planos | **A** | **R** | I | I |

---

## Sección 9 — Histogramas

> 4 meses (2026-01 a 2026-04). Horas-hombre + personas por mes.
> **NOTA: Yony Apaza (YA) no aparece en histogramas** (solo 3 de 4 personas).

```json
{
  "meses": ["2026-01", "2026-02", "2026-03", "2026-04"],
  "horasHombre": [
    {
      "etiqueta": "Jesús Mamani",
      "valoresPorMes": [40, 40, 40, 20],
      "total": 140
    },
    {
      "etiqueta": "Ángel Palomino",
      "valoresPorMes": [20, 56, 56, 28],
      "total": 160
    },
    {
      "etiqueta": "Alonso Piscoya",
      "valoresPorMes": [0, 20, 30, 20],
      "total": 70
    }
  ],
  "equipoTrabajo": [
    {
      "etiqueta": "Jesús Mamani",
      "valoresPorMes": [1, 1, 1, 1],
      "total": 4
    },
    {
      "etiqueta": "Ángel Palomino",
      "valoresPorMes": [1, 1, 1, 1],
      "total": 4
    },
    {
      "etiqueta": "Alonso Piscoya",
      "valoresPorMes": [0, 1, 1, 1],
      "total": 3
    }
  ]
}
```

**Resumen de horas-hombre:**

| Persona | Ene | Feb | Mar | Abr | **Total** |
|---------|-----|-----|-----|-----|----------|
| Jesús Mamani | 40 | 40 | 40 | 20 | **140** |
| Ángel Palomino | 20 | 56 | 56 | 28 | **160** |
| Alonso Piscoya | 0 | 20 | 30 | 20 | **70** |
| **TOTAL** | **60** | **116** | **126** | **68** | **370** |

> Total horas-hombre histograma: **370 h** vs cotización: **76 h** → divergencia 4.87×

---

## Sección 10 — Cronograma Resumen

> 9 filas. Suma de horasPlan: 6+6+6+10+14+12+8+8+6 = **76 h** ✅ (coincide con cotización).

```json
{
  "filas": [
    { "fase": "INGENIERÍA", "edt": "HMI - Desarrollo de Pantallas",  "actividad": "Plantilla HMI Instrumentos Analógicos", "fechaInicio": "2026-01-27", "fechaFin": "2026-02-05", "horasPlan": 6  },
    { "fase": "INGENIERÍA", "edt": "HMI - Desarrollo de Pantallas",  "actividad": "Plantilla HMI Motores",                 "fechaInicio": "2026-02-05", "fechaFin": "2026-02-07", "horasPlan": 6  },
    { "fase": "INGENIERÍA", "edt": "HMI - Desarrollo de Pantallas",  "actividad": "Plantilla HMI Variadores VFD",          "fechaInicio": "2026-02-07", "fechaFin": "2026-02-08", "horasPlan": 6  },
    { "fase": "INGENIERÍA", "edt": "PLC - Programación",             "actividad": "Configuración de Hardware y Comunicación","fechaInicio": "2026-02-08","fechaFin": "2026-02-09", "horasPlan": 10 },
    { "fase": "INGENIERÍA", "edt": "PLC - Programación",             "actividad": "Lógica de Mapeo de I/Os",               "fechaInicio": "2026-02-09", "fechaFin": "2026-02-11", "horasPlan": 14 },
    { "fase": "INGENIERÍA", "edt": "PLC - Programación",             "actividad": "Lógica de Mapeo de Variadores",         "fechaInicio": "2026-02-11", "fechaFin": "2026-02-13", "horasPlan": 12 },
    { "fase": "INGENIERÍA", "edt": "CAD - Planos Eléctricos",        "actividad": "Diagrama Unifilar",                     "fechaInicio": "2026-02-15", "fechaFin": "2026-02-16", "horasPlan": 8  },
    { "fase": "INGENIERÍA", "edt": "CAD - Planos Eléctricos",        "actividad": "Planos de Distribución Eléctrica",      "fechaInicio": "2026-02-16", "fechaFin": "2026-02-17", "horasPlan": 8  },
    { "fase": "INGENIERÍA", "edt": "CAD - Planos Eléctricos",        "actividad": "Planos de Arranque Directo DOL",        "fechaInicio": "2026-02-17", "fechaFin": "2026-02-18", "horasPlan": 6  }
  ]
}
```

> Rango del cronograma: 27-ene-2026 → 18-feb-2026 (**23 días**) vs contrato: 27-ene → 08-abr (**71 días**)

---

## Sección 11 — Responsabilidades

> 4 roles: operario (8 ítems), supervisor (8), gerenteGeneral (6), supervisorSeguridad (10).

```json
{
  "operario": [
    "Cumplir estrictamente los procedimientos de trabajo seguro y análisis de riesgo (ATS)",
    "Utilizar correctamente el EPP básico y específico según la tarea asignada",
    "Reportar inmediatamente condiciones inseguras, incidentes o casi accidentes al supervisor",
    "Participar activamente en charlas de seguridad diarias y capacitaciones del proyecto",
    "Mantener el orden y limpieza en el área de trabajo durante y al finalizar labores",
    "Seguir instrucciones técnicas del Residente y procedimientos de bloqueo eléctrico LOTO",
    "Registrar actividades ejecutadas en formatos de control del proyecto",
    "No realizar trabajos para los cuales no esté capacitado o autorizado"
  ],
  "supervisor": [
    "Liderar técnicamente el desarrollo de ingeniería en HMI, PLC y CAD conforme al cronograma",
    "Coordinar con el cliente la validación de entregables técnicos y requisitos funcionales",
    "Supervisar la calidad de programación, configuración y documentación generada",
    "Asegurar el cumplimiento de normativas técnicas IEC, ANSI, CNE y estándares del cliente",
    "Realizar pruebas FAT (Factory Acceptance Test) previas a implementación en sitio",
    "Coordinar con el supervisor SSOMA los aspectos de seguridad en trabajos eléctricos",
    "Reportar avance semanal al Gerente de Proyectos con desviaciones y acciones correctivas",
    "Gestionar cambios técnicos y mantener actualizado el registro de lecciones aprendidas"
  ],
  "gerenteGeneral": [
    "Aprobar el Plan de Trabajo y recursos asignados al proyecto YAN01 Migración de Horno",
    "Garantizar la asignación oportuna de personal calificado y equipos necesarios para la ejecución",
    "Supervisar el cumplimiento de compromisos contractuales con Minera Yanacocha",
    "Autorizar cambios al alcance del proyecto que impliquen modificaciones contractuales",
    "Asegurar el cumplimiento de la política SSOMA de GYS Control Industrial SAC",
    "Aprobar inversiones y gastos extraordinarios no contemplados en el presupuesto original"
  ],
  "supervisorSeguridad": [
    "Realizar inspecciones diarias de seguridad en áreas de trabajo y verificar uso correcto de EPP",
    "Aprobar permisos de trabajo y validar análisis de riesgo (ATS) antes del inicio de actividades",
    "Verificar el cumplimiento de procedimientos de bloqueo y etiquetado (LOTO) en trabajos eléctricos",
    "Realizar charlas de seguridad de 5 minutos previas al inicio de labores diarias",
    "Investigar incidentes, casi accidentes y condiciones subestándar, emitiendo reporte en 24 horas",
    "Coordinar con SSOMA de Minera Yanacocha el cumplimiento de estándares y requisitos del cliente",
    "Mantener actualizado el registro de capacitaciones, certificados médicos y permisos del personal",
    "Inspeccionar herramientas, equipos eléctricos y medios de protección antes de su uso",
    "Paralizar trabajos ante condiciones de riesgo inminente y reportar al Gerente de Proyectos",
    "Asegurar disponibilidad de EPP, equipos de emergencia y botiquín en obra"
  ]
}
```

---

## Sección 12 — Referencias

> Array de 15 documentos normativos. Todos con `origen: "NORMATIVA"`.

| # | Código | Título |
|---|--------|--------|
| 1 | LEY-29783 | Ley de Seguridad y Salud en el Trabajo |
| 2 | DS-005-2012-TR | Reglamento de la Ley de Seguridad y Salud en el Trabajo |
| 3 | RM-050-2013-TR | Formatos referenciales para el Sistema de Gestión de SST |
| 4 | RM-111-2013-MEM/DM | Reglamento de Seguridad y Salud en el Trabajo con Electricidad |
| 5 | DS-024-2016-EM | Reglamento de Seguridad y Salud Ocupacional en Minería |
| 6 | ANSI Z89.1-2014 | American National Standard for Industrial Head Protection |
| 7 | ANSI Z87.1+ | Occupational and Educational Personal Eye and Face Protection Devices |
| 8 | ASTM F2413-18 | Standard Specification for Performance Requirements for Protective Footwear |
| 9 | ASTM D120 | Standard Specification for Rubber Insulating Gloves |
| 10 | IEC 61131-3 | Programmable controllers - Part 3: Programming languages |
| 11 | IEC 60617 | Graphical symbols for diagrams |
| 12 | IEC 61439 | Low-voltage switchgear and controlgear assemblies |
| 13 | ISA-101 | Human Machine Interfaces for Process Automation Systems |
| 14 | NFPA 70 | National Electrical Code (NEC) |
| 15 | CNE-2011 | Código Nacional de Electricidad - Suministro y Utilización |

---

## Evaluación del output generado

### Calificación global: **7.5 / 10**

---

### ✅ Lo que salió bien

**1. Coherencia interna con la cotización**
Las 9 actividades del `alcanceDetallado` mapean perfectamente a los 3 EDT de la cotización (HMI×3, PLC×3, CAD×3), y el `cronogramaResumen` las replica con exactitud. La suma de horas del cronograma (76 h) coincide con el total cotizado. La IA entendió la estructura jerárquica EDT → actividad correctamente.

**2. Especificidad técnica real**
El contenido técnico es genuinamente específico: nombra modelos concretos de hardware (Siemens S7-300 314C, Allen-Bradley ControlLogix L30ER, Omron NX1P2), protocolos industriales (PROFIBUS, PROFINET, EtherNet/IP, EtherCAT, Modbus RTU/TCP), variadores reales (WEG CFW300 2.2kW, Mitsubishi FR-E800, INVT GD20 4kW) y normas exactas (IEC 61131-3, ISA-101, ASTM D120). No es texto genérico de plantilla.

**3. EPP y normativas de minería**
El EPP está bien categorizado (básico / bioseguridad / riesgo específico) con normas ANSI/ASTM pertinentes. Las 15 referencias normativas son todas reales y aplicables al contexto peruano (Ley 29783, RM-111-2013-MEM/DM, DS-024-2016-EM).

**4. Matriz RACI apropiada**
El nivel de granularidad (por EDT, no por actividad) es correcto para un proyecto de 76 horas. La distribución R/A/C/I refleja la realidad: AP ejecuta, JM aprueba, APS consulta en SSOMA.

**5. Restricciones completas y bien categorizadas**
15 restricciones con categorías semánticas (LOTO, permisos de trabajo, habilitaciones médicas). Relevantes para el contexto minero.

---

### ⚠️ Problemas detectados

**CRÍTICO — Divergencia histograma vs cotización (4.87×)**
Los histogramas asignan **370 horas-hombre** totales (JM 140 + AP 160 + APS 70) cuando la cotización es de **76 horas**. La IA no entendió que las horas del contexto representan el alcance total del servicio; en cambio generó histogramas como si fueran horas brutas de dedicación mensual, incluyendo horas de gestión, supervisión SSOMA y overhead no cotizados. Esto haría aparecer el proyecto como un contrato de $X cuando cuesta mucho menos.

**IMPORTANTE — Cronograma comprimido (23 días vs 71 días de contrato)**
Todo el trabajo queda entre 27-ene y 18-feb-2026. El contrato corre hasta 8-abr-2026. La IA asignó las 76 horas en 23 días corridos sin respetar el calendario laboral real (9.5 h/día del proyecto), resultando en actividades que duran 1-2 días en cronograma cuando probablemente abarquen semanas. El cronograma es técnicamente consistente en horas pero irrealista en fechas.

**MODERADO — `servicioCotizadoRefId` vacío en todos los ítems**
Los 9 ítems de `alcanceDetallado` tienen `servicioCotizadoRefId: ""`. La IA no pudo resolver la referencia a los servicios cotizados (HMI, PLC, CAD) porque el serializer le pasó los IDs de los servicios, pero no los nombres de los ítems del cotizador que permitieran hacer el match. Esto rompe la trazabilidad cotización → plan.

**MODERADO — `proyectoOrgNodoRefId` vacío en todos los miembros**
Los 4 miembros del `personalAsignado` tienen `proyectoOrgNodoRefId: ""`. La IA identificó correctamente a JM, AP, APS y YA desde el contexto del organigrama, pero no pudo vincular sus IDs de nodo porque el contexto no los exponía de forma directa. Sin este vínculo, el PDF del plan no puede renderizar el organigrama con referencias cruzadas.

**MENOR — Yony Apaza ausente en histogramas**
YA aparece en `personalAsignado` y en `matrizRaci` pero no en `histogramas`. La IA lo excluyó probablemente porque su rol es Jefe HSEQ (supervisión), lo cual es razonable, pero genera inconsistencia visible (4 personas en RACI, 3 en histograma).

**MENOR — Typo reiterativo "Pantillas" por "Pantallas"**
En 3 ítems del `alcanceDetallado` (11.1, 11.2, 11.3): "Desarrollo de Pantillas HMI" en lugar de "Pantallas HMI". El typo viene del nombre de la actividad en el cronograma del proyecto fuente — la IA lo copió literalmente, lo cual es correcto técnicamente pero el typo debería corregirse en origen.

---

### Diagnóstico de causas raíz

| Problema | Causa raíz probable |
|----------|---------------------|
| Histogramas 370h vs 76h | El serializer no expone el total de horas cotizadas de forma prominente; la IA inventó valores proporcionales al esfuerzo percibido |
| Cronograma 23 días vs 71 | El prompt no especifica calendario laboral (h/día); la IA asignó fechas sin restricción de horas por jornada |
| `servicioCotizadoRefId` vacío | El serializer lista los servicios cotizados pero sin el ID del ítem individual expuesto junto al nombre del EDT en la jerarquía |
| `proyectoOrgNodoRefId` vacío | El organigrama se serializa como texto de jerarquía, no como mapa nombre→ID consultable |

---

### Recomendaciones para Fase 3

1. **Histogramas**: En el prompt de generación, incluir explícitamente: "Las horas totales del proyecto son 76h. Los histogramas deben sumar exactamente ese total distribuido entre los responsables R de la RACI."
2. **Cronograma**: Exponer en el contexto las fechas reales del cronograma del proyecto (ya disponibles en `CronogramaContexto`), y pedir al modelo que las use como límite inferior/superior de cada actividad.
3. **`servicioCotizadoRefId`**: En el serializer, al listar servicios cotizados, incluir el ID del ítem junto al nombre, en formato `[ID_AQUI] Servicio HMI - Pantallas (18h)` para que el modelo pueda copiarlo.
4. **`proyectoOrgNodoRefId`**: Serializar el organigrama como tabla `nombre | siglas | nodoId` en lugar de jerarquía de texto.
