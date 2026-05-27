# Informe Mensual SSOMA

Página de informe mensual por proyecto. URL: `/seguridad/proyectos/[id]/informe-mensual`

## Organización

```
informe-mensual/
├── page.tsx                    # Client component principal (Tabs + exportadores)
├── loading.tsx                 # Skeleton de carga (Next.js)
├── imprimir/
│   ├── page.tsx                # Server component — vista de impresión A4
│   └── PrintControls.tsx       # Client component — botón imprimir
└── components/
    ├── SelectorMes.tsx         # Navegación ← Mes → (bloquea futuros)
    ├── KpiCard.tsx             # Tile de KPI con variantes de color
    ├── TablaExportable.tsx     # Tabla con TSV clipboard + ExcelJS export
    ├── GaleriaFotos.tsx        # Grid de thumbnails + lightbox Dialog
    ├── PestañaResumen.tsx      # KPI grid + gráfico Recharts + párrafo auto
    ├── PestañaDatos.tsx        # Info proyecto, partes, período
    ├── PestañaPersonal.tsx     # Tabla de personal del mes
    ├── PestañaJornadas.tsx     # Tabla filtrable + filas expandibles
    ├── PestañaEPP.tsx          # Entregas EPP con detalle de ítems
    ├── PestañaRegistros.tsx    # Registros de seguridad (8 tipos) + exports nombrados
    └── PestañaReportesSemanales.tsx  # Cards de reportes con links
```

## Fuente de datos

El agregado se obtiene en `src/lib/services/informeMensualSeguridad.ts`:

```ts
obtenerInformeMensual(proyectoId: string, mes: string): Promise<InformeMensualAgregado | null>
```

El tipo `InformeMensualAgregado` contiene:
- `proyecto` — datos del proyecto (cliente, gestor, comercial)
- `periodo` — mes, fechas, días laborables, label
- `kpis: KpisMensuales` — todos los contadores del mes
- `personal: PersonalMes[]` — personas únicas con horas y jornadas
- `jornadas: JornadaInforme[]` — registros de campo con tareas y miembros
- `registrosPorTipo: Record<TipoRegistroSeguridad, RegistroSeguridadInforme[]>`
- `entregasEpp: EntregaInforme[]`
- `reportesSemanales: ReporteInforme[]`

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/seguridad/informe-mensual/[proyectoId]?mes=YYYY-MM` | Devuelve `InformeMensualAgregado` |
| GET | `/api/seguridad/informe-mensual/[proyectoId]/exportar-excel?mes=YYYY-MM` | Descarga Excel con 12 hojas |
| GET | `/api/seguridad/informe-mensual/[proyectoId]/fotos-zip?mes=YYYY-MM&tipo=charla` | ZIP de fotos (tipo opcional) |

## Cómo agregar una pestaña nueva

1. Crear `components/PestañaNueva.tsx` como client component:
   ```tsx
   'use client'
   export function PestañaNueva({ data }: { data: InformeMensualAgregado }) { ... }
   ```
2. Importar en `page.tsx` y agregar `<TabsTrigger value="nueva">` + `<TabsContent value="nueva">`.
3. Si la pestaña es de un nuevo tipo de registro, agregar el tipo en `PestañaRegistros.tsx`
   siguiendo el patrón de los exports nombrados al final del archivo.

## Cómo modificar el exportador Excel

El endpoint está en `src/app/api/seguridad/informe-mensual/[proyectoId]/exportar-excel/route.ts`.

Cada hoja tiene su función `buildXxx(wb, data)`. Para agregar una hoja:
1. Crear función `buildNuevaHoja(wb: ExcelJS.Workbook, datos: TiposDatos)`.
2. Llamarla en el handler después de las hojas existentes.
3. Usar `addHeaders(ws, ['Col1', 'Col2'], [20, 30])` para el header estilizado.

## Vista de impresión

La ruta `/seguridad/proyectos/[id]/informe-mensual/imprimir?mes=YYYY-MM` genera una
vista A4 sin tabs, renderizada server-side con todos los datos expandidos.

- Usa `@page { size: A4; margin: 1.5cm }` en un `<style>` tag.
- Secciones con `class="break-before-page"` para saltos en PDF.
- Imágenes con `loading="eager"` para que se carguen antes de imprimir.
- El botón "Imprimir / Guardar PDF" llama `window.print()`.
