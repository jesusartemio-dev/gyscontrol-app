# 🔧 PLAN DE RECUPERACIÓN COMPLETO - BASE DE DATOS PRISMA

## 🎯 SITUACIÓN ACTUAL
- ✅ **Base de Datos:** Actualizada con 5 migraciones aplicadas (26 Nov 2025)
- ❌ **Schema.prisma:** Incompleto - faltan 13 modelos y 2 campos User
- ⚠️ **Resultado:** Desincronización entre BD y código causa errores

## 📋 PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS:
1. **User model** - Faltan campos `metaMensual`, `metaTrimestral`
2. **13 tablas completas faltantes** en schema.prisma
3. **Prisma Client cacheado** con schema obsoleto

### 🟡 CONSECUENCIAS:
- Error "The column `existe` does not exist"
- Type errors en código TypeScript
- Migraciones no aplicables por desincronización
- Funcionalidades CRM no disponibles

## 🛠️ PLAN DE RECUPERACIÓN

### PASO 1: RESCATAR SCHEMA ORIGINAL
```bash
# Buscar en historial de Git
git log --oneline --all | grep -i schema
git show <commit-hash>:prisma/schema.prisma > schema-original.prisma

# Si no hay backup:
# Recrear manualmente basado en migraciones
```

### PASO 2: SINCRONIZAR SCHEMA CON BD
```bash
# OPCIÓN A: Regenerar desde BD (si schema original perdido)
npx prisma db pull --force
npx prisma generate

# OPCIÓN B: Restaurar schema original y aplicar migraciones faltantes
cp schema-original.prisma prisma/schema.prisma
npx prisma generate
```

### PASO 3: LIMPIAR CACHÉ PRISMA
```bash
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma
npx prisma generate
```

### PASO 4: VALIDAR SINCRONIZACIÓN
```bash
npx prisma migrate status  # Debe mostrar "Database schema is up to date"
npx prisma db seed         # Debe ejecutarse sin errores
```

## 🚨 ACCIÓN INMEDIATA RECOMENDADA

### OPCIÓN 1: RESTAURACIÓN COMPLETA (RECOMENDADO)
```bash
# 1. Backup actual
cp prisma/schema.prisma schema-backup-$(date +%Y%m%d).prisma

# 2. Regenerar desde BD
npx prisma db pull --force
npx prisma generate

# 3. Verificar que no hay errores
npm run build
npm run dev
```

### OPCIÓN 2: MIGRACIÓN MANUAL
```sql
-- Si tienes el schema original, ejecutar manualmente:
-- (Las migraciones ya están aplicadas en BD)
```

### OPCIÓN 3: RESET COMPLETO (SI TODO FALLA)
```bash
# ⚠️ ESTO BORRA TODOS LOS DATOS
npx prisma migrate reset
npx prisma generate
npx prisma db seed
```

## 📝 MIGRACIONES ANALIZADAS

### ✅ MIGRACIONES SEGURAS:
1. `20250917162256_init` - Estructura base ✅
2. `20250918000731_cotizacion_extensiones` - Campos adicionales ✅  
3. `20250918043028_add_plantillas_cotizacion` - Modelos plantillas ✅
4. `20250919171819_add_crm_models` - **Campo NOT NULL problemático** ⚠️
5. `20250919234235_add_cotizacion_versions` - Versionado ✅

### ⚠️ MIGRACIÓN PROBLEMÁTICA:
`20250919171819_add_crm_models`:
```sql
ADD COLUMN "estadoRelacion" TEXT NOT NULL
```
- Si tabla Cliente tenía datos, pudo causar errores
- **SOLUCIÓN:** Verificar datos en Cliente.estadoRelacion

## 🎯 RECOMENDACIONES FINALES

1. **INMEDIATO:** Ejecutar `npx prisma db pull --force`
2. **VALIDAR:** Que build y dev funcionen sin errores
3. **BACKUP:** Hacer backup de BD antes de cualquier cambio adicional
4. **PREVENCIÓN:** Establecer proceso de validación schema-BD en CI/CD

## 📞 COMANDOS DE VERIFICACIÓN

```bash
# Verificar sincronización
npx prisma migrate status
npx prisma validate

# Verificar conectividad BD
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"_prisma_migrations\";"

# Test completo
npm run build && npm test
```

---
**ESTIMACIÓN:** 15-30 minutos para recuperación completa
**RIESGO:** Bajo (migraciones ya aplicadas en BD)
**IMPACTO:** Solucionará todos los errores de schema actuales