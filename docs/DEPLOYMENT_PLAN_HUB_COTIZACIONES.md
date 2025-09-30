# 🚀 Plan de Despliegue - Hub Unificado de Gestión de Cotizaciones

## 📋 Información General

**Proyecto**: Hub Unificado de Gestión de Cotizaciones  
**Versión**: 1.0.0  
**Fecha de Despliegue**: [Fecha programada]  
**Responsable Técnico**: [Nombre del Lead Técnico]  
**Responsable de Negocio**: [Nombre del Product Owner]  
**Equipo de Despliegue**: [Lista de miembros del equipo]

## 🎯 Objetivos del Despliegue

- ✅ Implementar el sistema completo de gestión de cotizaciones
- ✅ Migrar datos existentes sin pérdida de información
- ✅ Capacitar usuarios en el nuevo sistema
- ✅ Establecer monitoreo y soporte post-despliegue
- ✅ Validar funcionamiento en entorno productivo

## 📅 Cronograma de Despliegue

### **Fase 1: Preparación (Semana previa)**
- [ ] Configuración de entornos
- [ ] Pruebas de integración
- [ ] Migración de datos
- [ ] Capacitación de usuarios

### **Fase 2: Despliegue (Día D)**
- [ ] Despliegue técnico
- [ ] Validación funcional
- [ ] Activación del sistema

### **Fase 3: Post-Despliegue (2 semanas siguientes)**
- [ ] Monitoreo continuo
- [ ] Soporte a usuarios
- [ ] Optimizaciones menores

---

## 🔧 PRE-DESPLIEGUE

### **1. Requisitos del Sistema**

#### **Infraestructura**
- **Servidor Web**: Node.js 18+ / Next.js 15+
- **Base de Datos**: PostgreSQL 15+
- **Cache**: Redis 7+ (opcional pero recomendado)
- **Storage**: AWS S3 o compatible para archivos
- **CDN**: CloudFront o similar para assets estáticos

#### **Recursos Mínimos**
- **CPU**: 2 vCPUs
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Bandwidth**: 100Mbps

#### **Dependencias Externas**
- **Auth Provider**: NextAuth.js configurado
- **Email Service**: SMTP o servicio de email
- **Analytics**: Configurado para producción
- **Monitoring**: Datadog/New Relic configurado

### **2. Configuración de Entornos**

#### **Variables de Entorno Requeridas**
```bash
# Base de datos
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Autenticación
NEXTAUTH_URL="https://cotizaciones.gyscontrol.com"
NEXTAUTH_SECRET="your-secret-key"

# Analytics (Producción)
ANALYTICS_ENABLED="true"
ANALYTICS_ENDPOINT="https://analytics.gyscontrol.com/api/events"

# Email
SMTP_HOST="smtp.gyscontrol.com"
SMTP_USER="noreply@gyscontrol.com"
SMTP_PASS="your-smtp-password"

# Storage
AWS_S3_BUCKET="gys-cotizaciones-files"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# Monitoring
DD_API_KEY="datadog-api-key"
DD_APP_KEY="datadog-app-key"
```

#### **Configuración de Base de Datos**
```sql
-- Crear índices para performance
CREATE INDEX CONCURRENTLY idx_analytics_timestamp ON analytics_events (timestamp DESC);
CREATE INDEX CONCURRENTLY idx_analytics_category ON analytics_events (category, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_cotizaciones_lista ON cotizacion_proveedor_item (lista_equipo_item_id);

-- Configurar permisos
GRANT SELECT, INSERT, UPDATE ON analytics_events TO app_user;
GRANT USAGE ON SEQUENCE analytics_events_id_seq TO app_user;
```

### **3. Checklist de Pre-Despliegue**

#### **Técnico**
- [ ] ✅ Build de producción exitoso (`npm run build`)
- [ ] ✅ Tests pasando (cobertura > 80%)
- [ ] ✅ Linting sin errores
- [ ] ✅ TypeScript sin errores
- [ ] ✅ Base de datos migrada y seedada
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Certificados SSL válidos
- [ ] ✅ DNS configurado correctamente

#### **Datos**
- [ ] ✅ Backup completo de base de datos actual
- [ ] ✅ Script de migración de datos probado
- [ ] ✅ Datos de prueba en entorno staging
- [ ] ✅ Permisos de usuarios migrados
- [ ] ✅ Configuraciones personalizadas preservadas

#### **Seguridad**
- [ ] ✅ Auditoría de seguridad completada
- [ ] ✅ Secrets rotados para producción
- [ ] ✅ Firewall configurado
- [ ] ✅ Rate limiting implementado
- [ ] ✅ CORS configurado correctamente

#### **Usuario**
- [ ] ✅ Manual de usuario distribuido
- [ ] ✅ Sesiones de capacitación programadas
- [ ] ✅ Lista de usuarios con acceso confirmado
- [ ] ✅ Comunicación de cambio enviada
- [ ] ✅ Soporte técnico preparado

---

## 🚀 DESPLIEGUE TÉCNICO

### **Estrategia de Despliegue**
**Tipo**: Blue-Green Deployment  
**Tiempo Estimado**: 2 horas  
**Ventana de Mantenimiento**: 6:00 AM - 8:00 AM (hora local)

### **Pasos de Despliegue**

#### **Paso 1: Preparación (30 min)**
```bash
# 1. Crear backup completo
pg_dump -h prod-db -U admin gyscontrol > backup_pre_deploy.sql

# 2. Ejecutar migraciones de base de datos
npx prisma migrate deploy

# 3. Generar build de producción
npm ci --production=false
npm run build

# 4. Ejecutar tests en producción
npm run test:ci

# 5. Crear imagen Docker
docker build -t gys-cotizaciones:v1.0.0 .
```

#### **Paso 2: Despliegue Blue-Green (45 min)**
```bash
# 1. Desplegar nueva versión en entorno verde
kubectl set image deployment/cotizaciones-app cotizaciones=gys-cotizaciones:v1.0.0

# 2. Esperar health checks
kubectl rollout status deployment/cotizaciones-app

# 3. Ejecutar smoke tests
npm run test:smoke

# 4. Cambiar tráfico al entorno verde
kubectl patch service cotizaciones-service -p '{"spec":{"selector":{"version":"green"}}}'

# 5. Verificar funcionamiento
curl -f https://cotizaciones.gyscontrol.com/api/health
```

#### **Paso 3: Validación (30 min)**
```bash
# 1. Verificar conectividad
curl -f https://cotizaciones.gyscontrol.com/api/health

# 2. Probar funcionalidades críticas
npm run test:e2e:critical

# 3. Verificar base de datos
psql -h prod-db -U admin -d gyscontrol -c "SELECT COUNT(*) FROM lista_equipo;"

# 4. Verificar logs
kubectl logs -f deployment/cotizaciones-app --tail=100
```

#### **Paso 4: Activación (15 min)**
```bash
# 1. Actualizar DNS si es necesario
# (Configurado previamente)

# 2. Limpiar caché de CDN
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"

# 3. Notificar al equipo
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-type: application/json' \
  -d '{"text":"🚀 Hub de Cotizaciones desplegado exitosamente v1.0.0"}'
```

### **Comandos de Rollback**
```bash
# Rollback inmediato
kubectl rollout undo deployment/cotizaciones-app

# Rollback a versión específica
kubectl rollout undo deployment/cotizaciones-app --to-revision=2

# Restaurar base de datos si es necesario
psql -h prod-db -U admin gyscontrol < backup_pre_deploy.sql
```

---

## 📊 POST-DESPLIEGUE

### **Monitoreo Inicial (Primeras 24 horas)**

#### **Métricas Críticas**
- **Disponibilidad**: > 99.9%
- **Latencia**: < 500ms para APIs críticas
- **Errores**: < 0.1% de requests
- **Usuarios Activos**: Según baseline esperado

#### **Alertas Configuradas**
```yaml
# Prometheus Alert Rules
groups:
  - name: cotizaciones_app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
```

### **Validación Funcional**

#### **Checklist de Validación**
- [ ] ✅ Login funciona correctamente
- [ ] ✅ Listas de equipos se cargan
- [ ] ✅ Modo de actualización operativo
- [ ] ✅ Modo de selección funcional
- [ ] ✅ Operaciones masivas funcionan
- [ ] ✅ Reportes se generan correctamente
- [ ] ✅ Emails se envían (si aplicable)

#### **Pruebas de Usuario**
```bash
# Ejecutar pruebas automatizadas
npm run test:e2e:full

# Verificar analytics
curl https://cotizaciones.gyscontrol.com/api/analytics/summary

# Probar carga de datos
npm run test:load -- --users=50 --duration=300
```

### **Soporte Post-Despliegue**

#### **Equipo de Soporte**
- **Líder Técnico**: [Nombre] - [Contacto]
- **Soporte Nivel 1**: [Equipo] - [Horario]
- **Soporte Nivel 2**: [Equipo] - [Horario]
- **Escalación**: [Proceso de escalación]

#### **Canales de Comunicación**
- **Slack**: #cotizaciones-support
- **Email**: soporte.cotizaciones@gyscontrol.com
- **Teléfono**: [Número de soporte]
- **Portal**: help.gyscontrol.com

---

## 👥 CAPACITACIÓN DE USUARIOS

### **Estrategia de Capacitación**

#### **Audiencias Objetivo**
1. **Usuarios de Logística**: Operadores principales
2. **Gerentes de Proyecto**: Supervisores y aprobadores
3. **Administradores**: Configuración y mantenimiento
4. **Soporte Técnico**: Resolución de problemas

### **Materiales de Capacitación**

#### **Sesiones Presenciales**
- **Duración**: 2 horas por grupo
- **Frecuencia**: 2 sesiones diarias durante 3 días
- **Capacidad**: Máximo 15 personas por sesión
- **Contenido**:
  - Introducción al sistema
  - Demo funcional completa
  - Casos de uso prácticos
  - Resolución de dudas

#### **Materiales Digitales**
- **Manual de Usuario**: `docs/HUB_COTIZACIONES_USER_GUIDE.md`
- **Videos Tutoriales**: 15 videos cortos (2-5 min cada uno)
- **Guía Rápida**: Checklist de operaciones comunes
- **FAQ**: Preguntas frecuentes y respuestas

### **Plan de Capacitación Detallado**

#### **Día 1: Fundamentos**
- **Mañana**: Introducción y navegación
- **Tarde**: Modo de actualización

#### **Día 2: Operaciones Avanzadas**
- **Mañana**: Modo de selección y comparación
- **Tarde**: Operaciones masivas y reportes

#### **Día 3: Casos Especiales y Soporte**
- **Mañana**: Manejo de errores y casos edge
- **Tarde**: Sesión de preguntas y soporte continuo

### **Seguimiento Post-Capacitación**
- **Encuestas de Satisfacción**: Día 3 y Semana 2
- **Métricas de Adopción**: Uso semanal por usuario
- **Sesiones de Seguimiento**: Semanal durante primer mes
- **Portal de Auto-Aprendizaje**: Disponible 24/7

---

## 📈 MIGRACIÓN DE DATOS

### **Estrategia de Migración**
**Tipo**: Migración en vivo con respaldo completo  
**Tiempo Estimado**: 4 horas  
**Riesgo**: Medio (con plan de rollback completo)

### **Datos a Migrar**

#### **Entidades Principales**
- **Usuarios**: Perfiles y permisos
- **Proyectos**: Información básica
- **Equipos Cotizados**: Items y cantidades
- **Proveedores**: Información de contacto
- **Cotizaciones**: Estados y precios históricos

#### **Script de Migración**
```sql
-- Migración de datos existentes
BEGIN;

-- 1. Crear tabla temporal para backup
CREATE TABLE migration_backup AS
SELECT * FROM proyecto_equipo_cotizado;

-- 2. Migrar estructura de datos
INSERT INTO lista_equipo (nombre, proyecto_id, estado, ...)
SELECT nombre, proyecto_id, 'activo', ...
FROM proyecto_equipo_cotizado
WHERE estado = 'aprobado';

-- 3. Migrar items de equipos
INSERT INTO lista_equipo_item (lista_id, descripcion, cantidad, ...)
SELECT le.id, pec.descripcion, pec.cantidad, ...
FROM lista_equipo le
JOIN proyecto_equipo_cotizado pec ON le.nombre = pec.nombre;

-- 4. Verificar integridad
SELECT COUNT(*) as total_migrated FROM lista_equipo;

COMMIT;
```

### **Validación de Migración**
```bash
# Verificar counts
psql -c "SELECT 'proyectos' as table, COUNT(*) FROM proyecto;" -c "SELECT 'equipos' as table, COUNT(*) FROM lista_equipo;"

# Verificar integridad referencial
psql -c "SELECT COUNT(*) FROM lista_equipo_item lei LEFT JOIN lista_equipo le ON lei.lista_id = le.id WHERE le.id IS NULL;"

# Verificar datos críticos
psql -c "SELECT p.nombre, COUNT(lei.id) as items FROM proyecto p JOIN lista_equipo le ON p.id = le.proyecto_id JOIN lista_equipo_item lei ON le.id = lei.lista_id GROUP BY p.id, p.nombre;"
```

---

## 🔒 PLAN DE CONTINGENCIA

### **Escenarios de Riesgo**

#### **Escenario 1: Error en Despliegue**
**Probabilidad**: Media  
**Impacto**: Alto  
**Mitigación**:
- Rollback automático en < 5 minutos
- Base de datos respaldada completamente
- Comunicación clara al equipo

#### **Escenario 2: Pérdida de Datos**
**Probabilidad**: Baja  
**Impacto**: Crítico  
**Mitigación**:
- Backups automáticos cada hora
- Replicación en tiempo real
- Recuperación probada mensualmente

#### **Escenario 3: Sobrecarga del Sistema**
**Probabilidad**: Media  
**Impacto**: Medio  
**Mitigación**:
- Auto-scaling configurado
- Rate limiting implementado
- Monitoreo de recursos en tiempo real

### **Plan de Comunicación**

#### **Durante Despliegue**
- **Slack Channel**: #deploy-cotizaciones
- **Status Page**: status.gyscontrol.com
- **Email Broadcast**: Para stakeholders críticos

#### **Post-Despliegue**
- **Dashboard Público**: Métricas en tiempo real
- **Reportes Diarios**: Primeros 7 días
- **Alertas Automáticas**: Para incidentes críticos

---

## 📊 MÉTRICAS DE ÉXITO

### **Métricas Técnicas**
- **Uptime**: > 99.9% mensual
- **Performance**: < 2s para operaciones críticas
- **Error Rate**: < 0.1% de requests
- **User Satisfaction**: > 4.5/5 en encuestas

### **Métricas de Negocio**
- **Adopción**: 80% de usuarios activos en semana 1
- **Eficiencia**: 50% reducción en tiempo de cotización
- **Ahorro**: $X generado en primeros 3 meses
- **Satisfacción**: > 90% de usuarios satisfechos

### **KPIs de Seguimiento**
```yaml
# Métricas semanales (primer mes)
- active_users: "SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE timestamp > now() - interval '7 days'"
- avg_session_time: "SELECT AVG(session_duration) FROM user_sessions WHERE created_at > now() - interval '7 days'"
- error_rate: "SELECT COUNT(*) * 100.0 / (SELECT COUNT(*) FROM api_requests) FROM api_errors WHERE timestamp > now() - interval '7 days'"
- completion_rate: "SELECT COUNT(*) * 100.0 / (SELECT COUNT(*) FROM quotation_processes) FROM completed_processes WHERE completed_at > now() - interval '7 days'"
```

---

## ✅ CHECKLIST FINAL

### **Pre-Despliegue**
- [ ] Plan de despliegue aprobado
- [ ] Equipo de despliegue asignado
- [ ] Ventana de mantenimiento programada
- [ ] Comunicación enviada a usuarios
- [ ] Backups verificados
- [ ] Rollback plan documentado

### **Durante Despliegue**
- [ ] Checklist técnico completado
- [ ] Pruebas automatizadas pasando
- [ ] Monitoreo configurado
- [ ] Equipo de soporte listo
- [ ] Comunicación con stakeholders activa

### **Post-Despliegue**
- [ ] Validación funcional completada
- [ ] Usuarios capacitados
- [ ] Monitoreo operativo
- [ ] Métricas de éxito definidas
- [ ] Plan de soporte establecido

---

## 📞 CONTACTOS DE EMERGENCIA

### **Equipo Técnico**
- **Lead Técnico**: [Nombre] - [Teléfono] - [Email]
- **DevOps**: [Nombre] - [Teléfono] - [Email]
- **DBA**: [Nombre] - [Teléfono] - [Email]

### **Equipo de Negocio**
- **Product Owner**: [Nombre] - [Teléfono] - [Email]
- **Gerente de Proyecto**: [Nombre] - [Teléfono] - [Email]
- **Sponsor Ejecutivo**: [Nombre] - [Teléfono] - [Email]

### **Proveedores Externos**
- **Hosting**: [Proveedor] - [Contacto] - [SLA]
- **CDN**: [Proveedor] - [Contacto] - [SLA]
- **Monitoring**: [Proveedor] - [Contacto] - [SLA]

---

## 🎯 SIGN-OFF

### **Aprobaciones Requeridas**

#### **Técnica**
- [ ] **Lead Técnico**: Aprobación de arquitectura y despliegue
- [ ] **DevOps**: Aprobación de infraestructura y procesos
- [ ] **QA**: Aprobación de testing y calidad

#### **Negocio**
- [ ] **Product Owner**: Aprobación de funcionalidades
- [ ] **Usuario Piloto**: Validación de experiencia
- [ ] **Gerente de Área**: Aprobación de impacto operativo

#### **Ejecutiva**
- [ ] **Sponsor**: Aprobación final del proyecto
- [ ] **Gerencia**: Aprobación de presupuesto y timeline

---

*Este plan de despliegue se actualizará según sea necesario durante la preparación y ejecución del proyecto.*