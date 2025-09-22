# Diseño de Plantillas y Campos Adicionales para Digitalizar Cotizaciones (a partir de PDF)

**Objetivo:**  
Convertir la propuesta económica en PDF en una **plantilla digital reusable** y luego en una **cotización estructurada** dentro del sistema (Next.js + Prisma + PostgreSQL). Para ello añadiremos **campos adicionales** y **tablas auxiliares** que representen: cabecera comercial, condiciones, exclusiones, plazos por bloque y el cronograma comercial (snapshot) que alimentará el Proyecto.

---

## 1) Alcance

- **Entrada:** una propuesta PDF (ej. GYS-4251-25 R04) con cabecera, partidas de equipos/servicios/gastos, condiciones, exclusiones y plazos.
- **Salida:** datos normalizados en la base para:
  - Construir **plantillas** (reutilizables) por cliente/vertical.
  - Generar **cotizaciones** nuevas desde plantillas.
  - Mapear el **cronograma comercial** hacia `ProyectoEdt` al convertir la cotización en proyecto.
- **No objetivo:** cambiar la lógica de precios ya existente (se mantiene).

---

## 2) Qué agregaremos al modelo de datos

### 2.1. Cabecera comercial de la cotización
Campos nuevos en `Cotizacion` para reflejar lo que se ve en la portada del PDF: objeto/referencia, revisión, moneda, validez, forma de pago e IGV.

```prisma
model Cotizacion {
  referencia        String?
  formaPago         String?
  validezOferta     Int?
  fechaValidezHasta DateTime?
  moneda            String? @default("USD")
  revision          String?
  incluyeIGV        Boolean? @default(false)

  exclusiones       CotizacionExclusion[]
  condiciones       CotizacionCondicion[]
  cronograma        CotizacionEdt[]
}
```

### 2.2. Exclusiones de la oferta (lista)
```prisma
model CotizacionExclusion {
  id           String    @id @default(cuid())
  cotizacionId String
  descripcion  String
  cotizacion   Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
}
```

### 2.3. Condiciones / consideraciones (lista)
```prisma
model CotizacionCondicion {
  id           String    @id @default(cuid())
  cotizacionId String
  tipo         String?
  descripcion  String
  cotizacion   Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
}
```

### 2.4. Plazos por bloque (equipos, servicios, gastos)
```prisma
model CotizacionEquipo   { plazoEntregaSemanas Int? }
model CotizacionServicio { plazoEntregaSemanas Int? }
model CotizacionGasto    { plazoEntregaSemanas Int? }
```

### 2.5. Cronograma Comercial (snapshot)
Se usa `CotizacionEdt` y `CotizacionTarea`.  
En `ProyectoEdt` se agrega opcionalmente:
```prisma
model ProyectoEdt {
  cotizacionEdtOrigenId String?
}
```

---

## 3) Mapeo entre PDF → Base de datos

| Sección PDF        | Modelo / Campo DB                          |
|---------------------|--------------------------------------------|
| Cabecera / Objeto   | `Cotizacion.referencia`, `revision`        |
| Forma de pago       | `Cotizacion.formaPago`                     |
| Validez oferta      | `Cotizacion.validezOferta`                 |
| Moneda / IGV        | `Cotizacion.moneda`, `incluyeIGV`          |
| Exclusiones         | `CotizacionExclusion[]`                    |
| Condiciones         | `CotizacionCondicion[]`                    |
| Plazos por bloque   | `plazoEntregaSemanas` en padres            |
| Cronograma          | `CotizacionEdt` + `CotizacionTarea`        |
| Totales             | Campos de totales ya existentes            |

---

## 4) Plantillas reutilizables

- Guardan cabecera, exclusiones, condiciones, partidas y cronograma.
- Flujo: Plantilla → Nueva cotización → Ajustes → PDF/Markdown → Proyecto.

---

## 5) Conversión Cotización → Proyecto

Reglas:
- `ProyectoEdt.fechaInicioPlan = CotizacionEdt.fechaInicioComercial`
- `ProyectoEdt.fechaFinPlan    = CotizacionEdt.fechaFinComercial`
- `ProyectoEdt.horasPlan       = CotizacionEdt.horasEstimadas`
- `ProyectoEdt.responsableId   = CotizacionEdt.responsableId`
- `ProyectoEdt.cotizacionEdtOrigenId = CotizacionEdt.id`

---

## 6) APIs a exponer / actualizar

- `/api/cotizaciones/[id]` → update cabecera  
- `/api/cotizaciones/[id]/exclusiones` → CRUD  
- `/api/cotizaciones/[id]/condiciones` → CRUD  
- `/api/cotizaciones/servicios/[id]` → update plazo  
- `/api/cotizaciones/equipos/[id]` → update plazo  
- `/api/cotizaciones/gastos/[id]` → update plazo  
- `/api/cotizaciones/[cotizacionId]/edt` → CRUD  
- `/api/proyectos/from-cotizacion/[cotizacionId]` → conversión

---

## 7) Validaciones

- Fechas válidas en tareas/EDTs.  
- `CotizacionEdt` siempre ligado a `CotizacionServicio`.  
- `@@unique([cotizacionId, cotizacionServicioId, zona])`.  

---

## 8) Plan de migración

1. Actualizar schema Prisma.  
2. `npx prisma generate`  
3. `npx prisma migrate dev -n "cotizacion_extensiones"`  
4. Seeds de exclusiones/condiciones típicas.  
5. Actualizar endpoints + Zod.  
6. Test: Plantilla → Cotización → Proyecto.

---

## 9) UI/UX

- Pestaña **Cabecera** → referencia, pago, validez, moneda, revisión.  
- Pestaña **Exclusiones/Condiciones** → CRUD listas.  
- Pestaña **Plazos** → editar semanas por bloque.  
- Pestaña **Cronograma Comercial** → EDT + tareas.  
- Proyecto: vista comparativa **Comercial vs Plan vs Real**.

---

## 10) DoD

- Migraciones aplicadas.  
- Endpoints CRUD listos.  
- Cronograma comercial editable.  
- Conversión poblando `ProyectoEdt`.  
- UI básica operativa.  
- Tests de integración OK.

---
