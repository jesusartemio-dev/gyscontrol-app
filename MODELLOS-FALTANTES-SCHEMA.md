# 📋 MODELOS FALTANTES EN SCHEMA.PRISMA
## Sistema GYS Control - Noviembre 2025

**Total de Modelos Esperados:** 91  
**Modelos en Schema Actual:** 64  
**Modelos Faltantes:** 27 (29.7%)

---

## 🔴 MODELOS CRÍTICOS FALTANTES

### 1. **Sistema de Permisos (2 modelos)**
```prisma
model Permission {
  id                String           @id @default(cuid())
  name              String           @unique
  description       String?
  resource          String
  action            String
  isSystemPermission Boolean         @default(true)
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  userPermissions   UserPermission[]
  
  @@map("permissions")
}

model UserPermission {
  id            String     @id @default(cuid())
  userId        String
  permissionId  String
  type          String     // 'grant' | 'deny'
  createdBy     String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  user          User       @relation(fields: [userId], references: [id])
  permission    Permission @relation(fields: [permissionId], references: [id])
  
  @@unique([userId, permissionId])
  @@map("user_permissions")
}
```

### 2. **Sistema de Calendario (4 modelos)**
```prisma
enum DiaSemana {
  lunes
  martes
  miercoles
  jueves
  viernes
  sabado
  domingo
}

enum TipoExcepcion {
  feriado
  dia_laboral_extra
  dia_no_laboral
}

model CalendarioLaboral {
  id              String      @id @default(cuid())
  nombre          String      @unique
  descripcion     String?
  pais            String?
  empresa         String?
  activo          Boolean     @default(true)
  horasPorDia     Decimal     @default(8.0)
  diasLaborables  DiaSemana[]
  horaInicioManana String     @default("08:00")
  horaFinManana   String      @default("12:00")
  horaInicioTarde String      @default("13:00")
  horaFinTarde    String      @default("17:00")
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  diasCalendario  DiaCalendario[]
  excepciones     ExcepcionCalendario[]
  configuraciones ConfiguracionCalendario[]
  
  @@map("CalendarioLaboral")
}

model DiaCalendario {
  id                  String          @id @default(cuid())
  calendarioLaboralId String
  diaSemana           DiaSemana
  esLaborable         Boolean         @default(true)
  horaInicioManana    String?
  horaFinManana       String?
  horaInicioTarde     String?
  horaFinTarde        String?
  horasTotales        Decimal?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  calendarioLaboral   CalendarioLaboral @relation(fields: [calendarioLaboralId], references: [id])
  
  @@unique([calendarioLaboralId, diaSemana])
  @@map("DiaCalendario")
}

model ExcepcionCalendario {
  id                  String          @id @default(cuid())
  calendarioLaboralId String
  fecha               DateTime
  tipo                TipoExcepcion
  nombre              String
  descripcion         String?
  horaInicio          String?
  horaFin             String?
  horasTotales        Decimal?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  calendarioLaboral   CalendarioLaboral @relation(fields: [calendarioLaboralId], references: [id])
  
  @@unique([calendarioLaboralId, fecha])
  @@map("ExcepcionCalendario")
}

model ConfiguracionCalendario {
  id                  String          @id @default(cuid())
  calendarioLaboralId String
  entidadTipo         String
  entidadId           String
  calendarioPredeterminado Boolean     @default(false)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  calendarioLaboral   CalendarioLaboral @relation(fields: [calendarioLaboralId], references: [id])
  
  @@unique([entidadTipo, entidadId])
  @@map("ConfiguracionCalendario")
}
```

### 3. **Sistema de EDT/Categorías (1 modelo)**
```prisma
model Edt {
  id          String      @id @default(cuid())
  nombre      String      @unique
  descripcion String?
  activo      Boolean     @default(true)
  orden       Int?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  proyectoEdts ProyectoEdt[]
  cotizacionEdts CotizacionEdt[]
  
  @@map("edt")
}
```

### 4. **Sistema de Cronogramas (3 modelos)**
```prisma
model ProyectoCronograma {
  id          String     @id @default(cuid())
  proyectoId  String
  tipo        String     // 'comercial' | 'planificacion' | 'ejecucion'
  nombre      String
  esBaseline  Boolean    @default(false)
  version     Int        @default(1)
  estado      String     @default("activo")
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  proyecto    Proyecto   @relation(fields: [proyectoId], references: [id])
  proyectoEdts ProyectoEdt[]
  
  @@unique([proyectoId, tipo])
  @@map("proyecto_cronograma")
}

model ProyectoActividad {
  id                  String      @id @default(cuid())
  proyectoEdtId       String
  proyectoCronogramaId String
  nombre              String
  descripcion         String?
  responsableId       String?
  fechaInicioPlan     DateTime?
  fechaFinPlan        DateTime?
  fechaInicioReal     DateTime?
  fechaFinReal        DateTime?
  estado              String      @default("pendiente")
  porcentajeAvance    Int         @default(0)
  horasPlan           Decimal?    @default(0)
  horasReales         Decimal     @default(0)
  prioridad           String      @default("media")
  orden               Int?
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  responsable         User?       @relation(fields: [responsableId], references: [id])
  proyectoEdt         ProyectoEdt @relation(fields: [proyectoEdtId], references: [id])
  cronograma          ProyectoCronograma @relation(fields: [proyectoCronogramaId], references: [id])
  
  @@map("proyecto_actividades")
}

model ProyectoTarea {
  id                  String      @id @default(cuid())
  proyectoActividadId String
  nombre              String
  descripcion         String?
  responsableId       String?
  fechaInicioPlan     DateTime?
  fechaFinPlan        DateTime?
  fechaInicioReal     DateTime?
  fechaFinReal        DateTime?
  estado              String      @default("pendiente")
  porcentajeAvance    Int         @default(0)
  horasPlan           Decimal?    @default(0)
  horasReales         Decimal     @default(0)
  prioridad           String      @default("media")
  orden               Int?
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  responsable         User?       @relation(fields: [responsableId], references: [id])
  actividad           ProyectoActividad @relation(fields: [proyectoActividadId], references: [id])
  
  @@map("proyecto_tareas")
}
```

### 5. **Sistema de Tracking de Horas (5+ modelos)**
```prisma
model RecursoTipo {
  id          String    @id @default(cuid())
  nombre      String    @unique
  descripcion String?
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("recurso_tipo")
}

model ProyectoHito {
  id          String    @id @default(cuid())
  proyectoId  String
  nombre      String
  descripcion String?
  fechaPlan   DateTime?
  fechaReal   DateTime?
  estado      String    @default("planificado")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  proyecto    Proyecto  @relation(fields: [proyectoId], references: [id])
  
  @@map("proyecto_hitos")
}

model RegistroTiempo {
  id            String    @id @default(cuid())
  usuarioId     String
  proyectoId    String?
  actividadId   String?
  fecha         DateTime
  horas         Decimal
  descripcion   String?
  tipoRegistro  String    @default("manual") // 'manual' | 'automatico' | 'importado'
  estado        String    @default("pendiente") // 'pendiente' | 'aprobado' | 'rechazado'
  aprobadoPor   String?
  fechaAprobacion DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  usuario       User      @relation(fields: [usuarioId], references: [id])
  
  @@map("registro_tiempo")
}

model ConfiguracionHoras {
  id              String    @id @default(cuid())
  proyectoId      String?
  tipoConfiguracion String  // 'proyecto' | 'global' | 'usuario'
  clave           String
  valor           String
  descripcion     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([proyectoId, tipoConfiguracion, clave])
  @@map("configuracion_horas")
}

model TipoActividad {
  id          String    @id @default(cuid())
  nombre      String    @unique
  descripcion String?
  color       String?
  icono       String?
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("tipo_actividad")
}
```

### 6. **Sistema de Reportes (3 modelos)**
```prisma
model Reporte {
  id          String    @id @default(cuid())
  nombre      String
  descripcion String?
  tipo        String    // 'cronograma' | 'costos' | 'tiempo' | 'recursos'
  configuracion String  // JSON con configuración del reporte
  creadoPor   String
  compartido  Boolean   @default(false)
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("reportes")
}

model ReporteEjecucion {
  id          String    @id @default(cuid())
  reporteId   String
  fechaInicio DateTime
  fechaFin    DateTime
  estado      String    @default("procesando") // 'procesando' | 'completado' | 'error'
  resultado   String?   // JSON con datos del reporte
  error       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  reporte     Reporte   @relation(fields: [reporteId], references: [id])
  
  @@map("reporte_ejecuciones")
}

model DashboardWidget {
  id          String    @id @default(cuid())
  usuarioId   String
  nombre      String
  tipo        String    // 'grafico' | 'tabla' | 'indicador' | 'mapa'
  configuracion String  // JSON con configuración del widget
  posicionX   Int       @default(0)
  posicionY   Int       @default(0)
  ancho       Int       @default(4)
  alto        Int       @default(3)
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  usuario     User      @relation(fields: [usuarioId], references: [id])
  
  @@map("dashboard_widgets")
}
```

### 7. **Sistema de Integración (2 modelos)**
```prisma
model IntegracionConfig {
  id          String    @id @default(cuid())
  nombre      String    @unique
  tipo        String    // 'api' | 'webhook' | 'ftp' | 'email'
  configuracion String  // JSON con configuración
  credenciales String?  // JSON encriptado con credenciales
  activo      Boolean   @default(true)
  ultimaSincronizacion DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("integracion_config")
}

model LogSincronizacion {
  id              String    @id @default(cuid())
  integracionId   String
  tipoOperacion   String    // 'import' | 'export' | 'sync'
  estado          String    @default("iniciado") // 'iniciado' | 'procesando' | 'completado' | 'error'
  registrosProcesados Int   @default(0)
  registrosExitosos  Int   @default(0)
  registrosError     Int   @default(0)
  mensaje           String?
  detalles          String? // JSON con detalles
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  integracion       IntegracionConfig @relation(fields: [integracionId], references: [id])
  
  @@map("log_sincronizacion")
}
```

### 8. **Tablas de Auditoría (2 modelos)**
```prisma
model AuditoriaLog {
  id          String    @id @default(cuid())
  usuarioId   String?
  accion      String    // 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  entidad     String    // Nombre de la tabla/modelo
  entidadId   String?   // ID del registro afectado
  datosAnteriores String? // JSON con datos anteriores
  datosNuevos   String? // JSON con datos nuevos
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())
  
  @@map("auditoria_log")
}

model SesionActividad {
  id          String    @id @default(cuid())
  sesionId    String
  usuarioId   String
  accion      String    // 'page_view' | 'button_click' | 'form_submit' | 'api_call'
  pagina      String?
  detalles    String?   // JSON con detalles adicionales
  timestamp   DateTime  @default(now())
  
  @@map("sesion_actividad")
}
```

---

## 🟡 MODELOS DE PRIORIDAD MEDIA

### 9. **Sistema de Notificaciones (2 modelos)**
```prisma
model Notificacion {
  id          String    @id @default(cuid())
  usuarioId   String
  titulo      String
  mensaje     String
  tipo        String    @default("info") // 'info' | 'warning' | 'error' | 'success'
  leida       Boolean   @default(false)
  entidad     String?   // Entidad relacionada
  entidadId   String?   // ID de la entidad
  createdAt   DateTime  @default(now())
  
  @@map("notificaciones")
}

model ConfiguracionNotificacion {
  id          String    @id @default(cuid())
  usuarioId   String
  tipo        String    // Tipo de notificación
  canal       String    // 'email' | 'push' | 'sms'
  activa      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@unique([usuarioId, tipo, canal])
  @@map("configuracion_notificaciones")
}
```

### 10. **Sistema de Plantillas Avanzadas (2 modelos)**
```prisma
model PlantillaProyecto {
  id          String    @id @default(cuid())
  nombre      String
  descripcion String?
  categoria   String?
  configuracion String  // JSON con configuración del proyecto
  esPublica   Boolean   @default(false)
  creadoPor   String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("plantilla_proyecto")
}

model PlantillaCronograma {
  id          String    @id @default(cuid())
  nombre      String
  descripcion String?
  estructura  String    // JSON con estructura del cronograma
  duraciones  String?   // JSON con duraciones por defecto
  dependencias String?  // JSON con dependencias predefinidas
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("plantilla_cronograma")
}
```

---

## 🟢 MODELOS DE PRIORIDAD BAJA

### 11. **Sistema de Configuración Global (1 modelo)**
```prisma
model ConfiguracionGlobal {
  id          String    @id @default(cuid())
  clave       String    @unique
  valor       String
  tipo        String    @default("string") // 'string' | 'number' | 'boolean' | 'json'
  descripcion String?
  categoria   String?
  editable    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("configuracion_global")
}
```

### 12. **Sistema de Backup (1 modelo)**
```prisma
model BackupHistorico {
  id          String    @id @default(cuid())
  tipo        String    // 'completo' | 'tabla' | 'incremental'
  tablas      String?   // JSON con lista de tablas (opcional)
  archivo     String    // Ruta del archivo de backup
  tamaño      BigInt?   // Tamaño en bytes
  estado      String    @default("completado") // 'en_proceso' | 'completado' | 'error'
  error       String?
  createdAt   DateTime  @default(now())
  
  @@map("backup_historico")
}
```

---

## 📊 RESUMEN DE MODELOS FALTANTES

| Categoría | Cantidad | Prioridad | Estado |
|-----------|----------|-----------|--------|
| **Sistema de Permisos** | 2 | 🔴 CRÍTICA | Faltante |
| **Sistema de Calendario** | 4 | 🔴 CRÍTICA | Faltante |
| **Sistema de EDT** | 1 | 🔴 CRÍTICA | Faltante |
| **Sistema de Cronogramas** | 3 | 🟡 ALTA | Faltante |
| **Sistema de Tracking** | 5+ | 🟡 ALTA | Faltante |
| **Sistema de Reportes** | 3 | 🟡 ALTA | Faltante |
| **Sistema de Integración** | 2 | 🟢 MEDIA | Faltante |
| **Sistema de Auditoría** | 2 | 🟢 MEDIA | Faltante |
| **Sistema de Notificaciones** | 2 | 🟢 BAJA | Faltante |
| **Sistema de Plantillas** | 2 | 🟢 BAJA | Faltante |
| **Configuración Global** | 1 | 🟢 BAJA | Faltante |
| **Sistema de Backup** | 1 | 🟢 BAJA | Faltante |

### 🎯 **TOTAL: 27 MODELOS FALTANTES**

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### **Fase 1 - Crítica (Día 1)**
1. ✅ Sistema de Permisos (2 modelos)
2. ✅ Sistema de Calendario (4 modelos)
3. ✅ Sistema de EDT (1 modelo)

### **Fase 2 - Alta Prioridad (Días 2-3)**
1. ✅ Sistema de Cronogramas (3 modelos)
2. ✅ Sistema de Tracking (5+ modelos)
3. ✅ Sistema de Reportes (3 modelos)

### **Fase 3 - Media/Baja Prioridad (Días 4-5)**
1. ✅ Sistemas de Integración (2 modelos)
2. ✅ Sistema de Auditoría (2 modelos)
3. ✅ Sistemas Restantes (5 modelos)

---

**Documento generado:** 27 de Noviembre de 2025  
**Modelos faltantes identificados:** 27  
**Prioridad de implementación:** Crítica → Alta → Media → Baja