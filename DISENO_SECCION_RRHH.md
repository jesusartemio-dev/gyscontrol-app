# Diseño: Sección RRHH en el sidebar

> Plan de implementación. Escrito con Opus para ejecutarse con Sonnet.
> Fecha: 2026-09-04

## Problema

La asistencia vive hoy bajo `/supervision/asistencia`, pero no es información de
supervisión: `GET /api/asistencia/reporte` **no filtra por equipo del
supervisor**, devuelve los marcajes de toda la empresa con `latitud`,
`longitud`, `minutosTarde` y dispositivo de cada persona. Es un padrón de RRHH,
no una herramienta de obra.

Además ya hay una inconsistencia en producción: cuatro endpoints de asistencia
tienen `'administracion'` en su allowlist, pero el rol `administracion` no tiene
la sección `supervision` ni `configuracion`, así que el middleware lo manda a
`/denied`. **El backend ya asume que existe RRHH; falta la sección.**

Y hay un rol `coordinador_rrhh` referenciado en 4 archivos que no existe en
`RolUsuario` ni en `ALL_ROLES` — código muerto de un intento previo.

## Criterio de reparto

**Supervisión responde "¿mi gente está produciendo?"** — por proyecto, de hoy.
**RRHH responde "¿mi gente está cumpliendo?"** — por persona, acumulado.

| Se queda en Supervisión | Se va a RRHH | Se queda en Configuración |
|---|---|---|
| Vista `por_proyecto` (único tab operativo) | Vistas `detalle`, `resumen`, `horas_dia`, `ranking`, `sesiones` | Ubicaciones y geocercas |
| QR del Día, Jornada Campo, Bloqueos Campo | Dashboard de puntualidad/tardanzas | Sedes Remotas |
| Timesheet (1er nivel) | Personal, Cargos, Departamentos | Modalidades de Trabajo |
| Aprobar Ausencias (1er nivel) | Tipos de Ausencia, Saldos de Ausencia | Calendarios Laborales |
| Aprobar Dispositivos (ver nota D3) | | Plantillas Organigrama |

> **Ajuste hecho durante la implementación:** `horas_dia` se movió de
> Supervisión a RRHH (el plan original la dejaba en Supervisión). Motivo: no
> tiene endpoint propio — se calcula en el cliente a partir del mismo payload
> de `/api/asistencia/reporte` que usan `detalle`/`resumen`/`ranking` (GPS,
> `minutosTarde`, dispositivo de toda la empresa). Dejarla visible para
> `coordinador`/`gestor`/`proyectos` habría obligado a mantenerlos en el
> `ROLES_VIEW` de `reporte`, y el payload de red seguiría exponiendo esos datos
> aunque la UI los ocultara. Solo `por_proyecto` (con su propio endpoint
> `/api/asistencia/por-proyecto`, sin GPS) quedó como vista operativa.

## Decisiones tomadas (no re-litigar)

- **D1 — No se mueven archivos en esta fase.** `RUTAS_MULTISECCION`
  ([sections.ts:106](src/lib/config/sections.ts#L106)) se evalúa *antes* que
  `ROUTE_TO_SECTION` en el [middleware](src/middleware.ts#L48-L54), así que una
  sección nueva puede apuntar a rutas existentes sin romper URLs ni bookmarks.
  Mover `/supervision/asistencia` → `/rrhh/asistencia` es Fase 2.
- **D2 — No hay migración de Prisma.** `RoleSectionAccess.sectionKey` es
  `String`, no enum ([schema.prisma:4310](prisma/schema.prisma#L4310)). Solo hay
  que correr el seed.
- **D3 — "Aprobar Dispositivos" se queda en Supervisión.** Su API es
  `['admin','gerente','coordinador','gestor']`; moverla a RRHH le quitaría el
  acceso a coordinador/gestor, que son quienes conocen a su gente. Se revisa
  aparte si hace falta.
- **D4 — La página `/supervision/asistencia` NO se parte todavía.** Son 1617
  líneas. En Fase 1 se gatean las vistas por rol dentro de la misma página; eso
  cierra el hueco de privacidad sin refactor grande.
- **D5 — RRHH es de lectura. La configuración se queda en Configuración.**
  Ubicaciones, Sedes Remotas y Modalidades de Trabajo las define solo el
  administrador y siguen en la sección Configuración, cerradas a
  `['admin','gerente']`. Lo mismo las correcciones de registros (borrar
  asistencias, editar horarios de jornada). La sección RRHH le da a
  Administración **reportes y padrón**, no permisos de escritura. Ningún
  allowlist de escritura se amplía en este plan.

---

## Fase 1 — Sección RRHH + cierre del hueco de privacidad

### 1. `src/lib/config/sections.ts`

**1.1** Agregar `'rrhh'` a `SECTION_KEYS`, justo después de `'supervision'`.

**1.2** `SECTION_LABELS`: `rrhh: 'RRHH'`.

**1.3** `DEFAULT_ROLE_SECTIONS`: agregar `'rrhh'` a `admin`, `gerente` y
`administracion`. **A ningún otro rol** — el punto del cambio es que
`coordinador`/`gestor`/`proyectos` dejen de ver el padrón completo.

**1.4** `RUTAS_MULTISECCION`: agregar estas entradas. Mantenerlas **disjuntas**
entre sí — el middleware usa `.find()` (primer match gana), no el prefijo más
largo, así que prefijos que se solapen se resuelven en orden de array:

```ts
{ prefix: '/supervision/asistencia',        sections: ['supervision', 'rrhh'] },
{ prefix: '/admin/asistencia/dashboard',    sections: ['configuracion', 'rrhh'] },
{ prefix: '/admin/personal',                sections: ['configuracion', 'rrhh'] },
{ prefix: '/configuracion/cargos',          sections: ['configuracion', 'rrhh'] },
{ prefix: '/configuracion/departamentos',   sections: ['configuracion', 'rrhh'] },
{ prefix: '/configuracion/tipos-ausencia',  sections: ['configuracion', 'rrhh'] },
{ prefix: '/administracion/saldos-ausencia', sections: ['administracion', 'rrhh'] },
```

> Ojo 1: `/supervision/asistencia` cubre también
> `/supervision/asistencia/dispositivos`. Eso está bien — RRHH puede entrar,
> pero el link no se le muestra (D3) y su API sigue cerrada.
>
> Ojo 2: el prefijo de `/admin/asistencia` es **solo `/dashboard`**, a
> propósito. `/admin/asistencia/ubicaciones`, `/sedes-remotas` y `/modalidades`
> se quedan resolviendo por `ROUTE_TO_SECTION` (`/admin` → `configuracion`),
> así que Administración sigue sin poder entrar a configurarlas (D5).

### 2. `src/components/Sidebar.tsx`

**2.1** Agregar `rrhh: false` al estado inicial `openSections`
([línea ~112](src/components/Sidebar.tsx#L112)).

**2.2** Insertar el bloque de sección **después** del bloque `supervision`
(cierra en [línea 305](src/components/Sidebar.tsx#L305)):

```tsx
// 2.3. RRHH - Personal, asistencia y cumplimiento (RRHH / Administración)
{
  key: 'rrhh',
  title: 'RRHH',
  icon: UserCheck,
  color: 'text-pink-400',
  roles: ['admin', 'gerente', 'administracion'],
  links: [
    { href: '/admin/asistencia/dashboard', label: 'Dashboard Asistencia', icon: BarChart3 },
    { href: '/supervision/asistencia', label: 'Reporte de Asistencia', icon: ClipboardList },
    { href: '/admin/personal', label: 'Personal', icon: UserCheck },
    { href: '/configuracion/cargos', label: 'Cargos', icon: Briefcase },
    { href: '/configuracion/departamentos', label: 'Departamentos', icon: Building2 },
    { href: '/administracion/saldos-ausencia', label: 'Saldos de Ausencia', icon: CalendarOff },
    { href: '/configuracion/tipos-ausencia', label: 'Tipos de Ausencia', icon: CalendarOff },
  ],
},
```

Sin submenú de configuración: ubicaciones, sedes remotas y modalidades se quedan
en Configuración (D5). Todos los iconos ya están importados
([líneas 10-71](src/components/Sidebar.tsx#L10-L71)).

**2.3** En la sección `supervision`, renombrar el link para que refleje qué
verá realmente un supervisor:

```diff
- { href: '/supervision/asistencia', label: 'Asistencia del Equipo', icon: ClipboardList },
+ { href: '/supervision/asistencia', label: 'Asistencia por Proyecto', icon: ClipboardList },
```

**2.4** En la sección `configuracion`, **quitar solo** lo que ahora vive en RRHH
(admin/gerente ven ambas secciones; dejarlo duplicaría los links):
- `Personal (RRHH)` ([línea 474](src/components/Sidebar.tsx#L474))
- `Cargos`, `Departamentos` ([475-476](src/components/Sidebar.tsx#L475-L476))
- `Tipos de Ausencia` ([línea 509](src/components/Sidebar.tsx#L509))
- dentro del submenú `#asistencia-configuracion`, **únicamente** la entrada
  `Dashboard` ([línea 486](src/components/Sidebar.tsx#L486))

**El submenú `#asistencia-configuracion` se mantiene** con sus otras tres
entradas — `Ubicaciones`, `Sedes Remotas`, `Modalidades de Trabajo` (D5). Solo
pierde el Dashboard, que es reporte, no configuración.

También se quedan en Configuración: `Plantillas Organigrama` (es plantilla de
proyecto, no de RRHH) y `Calendarios Laborales`.

### 3. `src/components/MobileSidebar.tsx`

Espejo exacto de los cambios 2.2, 2.3 y 2.4. La estructura es idéntica: el
bloque `supervision` está en [línea 257](src/components/MobileSidebar.tsx#L257)
y el submenú de asistencia en Configuración en
[línea 435](src/components/MobileSidebar.tsx#L435). Verificar que los iconos
usados estén importados en este archivo también (`UserCheck`, `Settings`,
`Briefcase`, `CalendarOff` — confirmar antes de guardar).

### 4. `src/components/admin/UserPermissionsManager.tsx`

**4.1** Agregar la sección `rrhh` al array `SECTIONS`, después del bloque
`supervision` ([línea 195-208](src/components/admin/UserPermissionsManager.tsx#L195-L208)),
con los mismos `roles` y una lista corta de links (esta UI solo los muestra como
referencia, no navega).

**4.2** Bonus de 1 línea: `ALL_ROLES_ORDERED`
([línea 295](src/components/admin/UserPermissionsManager.tsx#L295)) tiene 12
roles pero `ALL_ROLES` tiene 13 — falta `coordinador_logistico`, así que ese rol
no aparece en la matriz de permisos. Agregarlo después de `coordinador`.

### 5. Gating de vistas en `src/app/supervision/asistencia/page.tsx`

Esta es la parte que cierra el hueco de privacidad sin partir la página (D4).

**5.1** Junto a `esAdmin` ([línea 128](src/app/supervision/asistencia/page.tsx#L128)):

```ts
// Las vistas nominales (detalle/resumen/ranking/sesiones) exponen GPS,
// tardanzas y dispositivo de toda la empresa: son de RRHH. Supervisión solo
// necesita el corte por proyecto/horas.
const puedeVerRRHH = tieneRol(session, ['admin', 'gerente', 'administracion'])
```

**5.2** Estado inicial de `vista` ([línea 143](src/app/supervision/asistencia/page.tsx#L143)):
arrancar en `'por_proyecto'` cuando `!puedeVerRRHH`. Como `session` llega async,
usar un `useEffect` que corrija la vista si quedó en una prohibida, en vez de
depender del valor inicial del `useState`.

**5.3** Restauración de localStorage ([línea 264](src/app/supervision/asistencia/page.tsx#L264)):
no restaurar `saved.vista` si es una vista RRHH y el usuario no lo es.

**5.4** Toggle de vistas ([líneas 775-810](src/app/supervision/asistencia/page.tsx#L775-L810)):
envolver los botones `Detalle`, `Resumen`, `Ranking` y `Sesiones` en
`{puedeVerRRHH && (...)}`. `Por Proyecto` y `Horas por día` siempre visibles.

**5.5** Los bloques de render de esas vistas ya son condicionales por
`vista === '...'`, y como el estado nunca puede llegar a esos valores no hace
falta tocarlos. El botón de exportar ya está condicionado a
`vista !== 'por_proyecto' && vista !== 'horas_dia'`
([línea 679](src/app/supervision/asistencia/page.tsx#L679)), así que se oculta solo.

**5.6** Ajustar el `<h1>` ([línea 593](src/app/supervision/asistencia/page.tsx#L593))
para que diga "Asistencia por Proyecto" cuando `!puedeVerRRHH`.

### 6. Endpoints — cerrar el acceso amplio

El gating de UI no basta: los endpoints se pueden llamar directo.

**6.1 — Ajustado durante la implementación.** El plan original decía "quitar
solo `proyectos`, dejar `coordinador`/`gestor`". Pero con `horas_dia` movida a
RRHH (ver ajuste arriba), `coordinador`/`gestor`/`proyectos` ya no tienen
**ninguna** vista visible que dependa de `reporte` ni de `jornada/todas` — su
único tab restante, "Por Proyecto", usa `/api/asistencia/por-proyecto`, un
endpoint aparte. Dejarlos en el allowlist habría sido acceso de red sin uso en
la UI (y el punto entero del cambio es que ese acceso de red no exista).
`ROLES_VIEW` quedó en `['admin', 'gerente', 'administracion']` en los tres:
- [api/asistencia/reporte/route.ts:7](src/app/api/asistencia/reporte/route.ts#L7)
- [api/asistencia/jornada/todas/route.ts:7](src/app/api/asistencia/jornada/todas/route.ts#L7)
- [api/asistencia/visitas-externas-mes/route.ts:7](src/app/api/asistencia/visitas-externas-mes/route.ts#L7)

**6.2** `GET /api/asistencia/por-proyecto` **no tiene guard de rol** — solo
verifica sesión ([route.ts:16](src/app/api/asistencia/por-proyecto/route.ts#L16)).
Cualquier usuario autenticado, incluido `terceros`, puede leer las horas por
persona y proyecto de toda la empresa. Agregar:

```ts
const ROLES_VIEW = ['admin', 'gerente', 'coordinador', 'gestor', 'proyectos', 'administracion']
if (!tieneRol(session, ROLES_VIEW)) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}
```

Aquí sí se deja `'proyectos'`: es la vista por proyecto, que es justamente lo
que le corresponde ver.

**6.3** Limpiar el rol fantasma `coordinador_rrhh`. No existe en `RolUsuario`
([modelos.ts:20-33](src/types/modelos.ts#L20-L33)) ni en `ALL_ROLES`, así que
esos checks nunca pueden pasar. **Borrarlo del array, sin reemplazo** — queda
`['admin','gerente']`, que es el comportamiento efectivo de hoy y el que
corresponde por D5:
- [api/admin/sedes-remotas/route.ts:7](src/app/api/admin/sedes-remotas/route.ts#L7)
- [api/admin/sedes-remotas/[id]/aprobar/route.ts:7](src/app/api/admin/sedes-remotas/[id]/aprobar/route.ts#L7)
- [api/admin/sedes-remotas/[id]/rechazar/route.ts:7](src/app/api/admin/sedes-remotas/[id]/rechazar/route.ts#L7)
- [api/asistencia/jornada/[id]/horario/route.ts:34](src/app/api/asistencia/jornada/[id]/horario/route.ts#L34)

Es limpieza pura: nadie gana ni pierde acceso, porque nadie podía tener ese rol.

**6.4 — Resuelto, no hacer nada.** Los endpoints de configuración de asistencia
(`ubicaciones`, `sedes-remotas`, `modalidades`, `geocode`) y los de corrección de
registros (`DELETE /api/asistencia/[id]`, `jornada/[id]`) se quedan tal cual en
`['admin','gerente']`. Esa configuración la hace solo el administrador (D5).
**No agregar `'administracion'` a ningún allowlist de escritura.**

### 7. Despliegue

`getSectionAccessForRoles` lee de la tabla `role_section_access` y **solo cae al
default si el rol no tiene ninguna fila** ([section-access.ts:22-27](src/lib/services/section-access.ts#L22-L27)).
Como la tabla ya está poblada en producción, agregar `'rrhh'` a
`DEFAULT_ROLE_SECTIONS` **no basta**.

Después de desplegar, entrar como `admin` a `/admin/permisos` y usar el botón de
sincronizar secciones (`POST /api/admin/section-access` → `seedSectionAccess()`).
Ese seed hace `upsert` con `update: {}`, así que crea las filas faltantes de
`rrhh` con el `hasAccess` correcto y **no pisa** ningún permiso que ya hayas
ajustado a mano ([section-access.ts:144-157](src/lib/services/section-access.ts#L144-L157)).

Los usuarios ya logueados tienen `sectionAccess` cacheado en el JWT, pero el
Sidebar llama `updateSession()` en cada `focus` de ventana
([Sidebar.tsx:104-108](src/components/Sidebar.tsx#L104-L108)) y el callback
`update` recalcula `sectionAccess` desde BD
([auth.ts:105](src/lib/auth.ts#L105)) — así que basta con que cambien de pestaña
y vuelvan. No hace falta forzar re-login.

### 8. Verificación

- [x] `npx tsc --noEmit` limpio.
- [x] `npx eslint` en los 13 archivos tocados — 0 errores (2 warnings
      preexistentes de `react-hooks/exhaustive-deps`, ajenos a este cambio).
- [ ] Login como `administracion`: aparece la sección RRHH; `/supervision/asistencia`
  abre y muestra las 6 vistas; `/admin/asistencia/dashboard` abre;
  `/supervision/equipo` sigue dando `/denied`.
- [ ] Login como `administracion`: `/admin/asistencia/ubicaciones`,
  `/admin/asistencia/modalidades` y `/admin/asistencia/sedes-remotas` dan
  `/denied` (D5). Este es el chequeo que confirma que el prefijo de
  `RUTAS_MULTISECCION` quedó acotado a `/dashboard` y no a `/admin/asistencia`.
- [ ] Login como `proyectos` o `coordinador`: `/supervision/asistencia` abre
  pero **solo** con "Por Proyecto" (ni "Horas por día" — ver ajuste arriba); no
  hay botón de exportar.
- [ ] `curl` a `/api/asistencia/reporte`, `/api/asistencia/jornada/todas` y
  `/api/asistencia/visitas-externas-mes` con sesión de `proyectos` o
  `coordinador` → 403 en los tres.
- [ ] `curl` a `/api/asistencia/por-proyecto` con sesión de `terceros` → 403
  (antes no tenía guard de rol, cualquier autenticado pasaba).
- [ ] Login como `admin`: los links de RRHH no están duplicados en
  Configuración (Personal, Cargos, Departamentos, Tipos de Ausencia y el
  Dashboard de asistencia aparecen solo en RRHH).

Pendiente de correr en un entorno con base de datos y sesiones reales — no
disponible desde esta sesión de edición de código.

---

## Fase 2 — Estado

Plan completo en `C:\Users\jesus\.claude\plans\recursive-dancing-stroustrup.md`
(sesión Sonnet). Alcance: solo los ítems 1 y 2 originales; 3 y 4 quedan como
decisiones de diseño aparte, no tocadas.

1. **[x] Partir la página de 1644 líneas.** Con `horas_dia` ya movida a RRHH
   en Fase 1 (ver ajuste arriba), el split real quedó: `detalle`/`resumen`/
   `horas_dia`/`ranking`/`sesiones` → `src/app/rrhh/asistencia/page.tsx`
   (~1300 líneas); `por_proyecto` (única vista, sin toggle) →
   `src/app/supervision/asistencia/page.tsx` (~280 líneas, reescrita en el
   mismo archivo — la URL no cambia). Se eliminó por completo `puedeVerRRHH`
   y el `useEffect` de corrección de Fase 1: ya no hacen falta, cada página
   es de un solo público por construcción. `STORAGE_KEY` se separó en dos
   (`gys_asistencia_filtros` para RRHH, `gys_asistencia_por_proyecto_filtros`
   nueva para Supervisión) para que no se pisen el localStorage.
2. **[x] Rutas movidas físicamente** a `/rrhh/*`: `asistencia/dashboard`,
   `personal`, `cargos`, `departamentos`, `tipos-ausencia`, `saldos-ausencia`
   (`git mv`, sin cambios de contenido). `ROUTE_TO_SECTION` ganó
   `'/rrhh': 'rrhh'`; las 7 entradas de `RUTAS_MULTISECCION` que Fase 1 había
   agregado se borraron enteras — ya no hacen falta. 6 redirects
   `permanent: true` en `next.config.ts` para las URLs viejas (no se redirige
   `/supervision/asistencia`: esa URL sigue viva, solo cambió qué sirve).
   De paso se encontró y limpió un link duplicado y ahora-muerto a
   `/administracion/saldos-ausencia` en la sección Administración del sidebar
   (no era parte de RRHH, Fase 1 no lo había tocado) y dos menciones de texto
   a `/admin/personal` (`PagoTercerosModal.tsx`, comentario en
   `pisoPlanilla.ts`) que habrían quedado apuntando a una ruta muerta.

Verificado: `npx tsc --noEmit` limpio, `eslint` sin errores en los ~19
archivos tocados, y `npx next build` completo sin errores — la tabla de rutas
del build confirma `/rrhh/*` generadas y ninguna de las 6 rutas viejas
presente. Pendiente (no ejecutable desde una sesión de solo-código): probar
en el navegador con sesiones reales que los redirects 301 funcionan y que
cada rol ve exactamente lo que debe.

3. **Scope por equipo en `reporte`.** Que `coordinador`/`gestor` solo vean a la
   gente de sus proyectos, en vez de a toda la empresa. No tocado.
4. **Evaluar un rol `rrhh` propio**, separado de `administracion`, si el área
   crece y no debe ver Cuentas por Cobrar ni Facturación. No tocado.
