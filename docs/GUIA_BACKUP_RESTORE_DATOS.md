# Guía de Backup y Restauración de Datos

Esta guía explica cómo hacer backup y restaurar los datos reales de la base de datos GYS para desarrollo y testing.

## 📋 Scripts Disponibles

### Backup de Datos
```bash
npm run db:backup
```

Este comando extrae todos los datos actuales de la base de datos y los guarda en un archivo JSON en la carpeta `data/`.

### Restauración de Datos
```bash
npm run db:restore
```

Este comando limpia la base de datos actual y restaura los datos desde el archivo de backup más reciente.

## 🔄 Flujo de Trabajo Recomendado

### Para Desarrollo con Datos Reales

1. **Extraer datos iniciales** (una sola vez):
   ```bash
   npm run db:backup
   ```

2. **Durante desarrollo**, cuando necesites resetear la BD:
   ```bash
   npm run db:restore
   ```

3. **Después de cambios importantes**, actualizar el backup:
   ```bash
   npm run db:backup
   ```

## 📁 Estructura de Archivos

```
data/
├── current-data-2025-09-24T19-31-01-735Z.json  # Archivo de backup
└── ...

scripts/
├── extract-current-data.ts    # Script de extracción
└── restore-current-data.ts    # Script de restauración
```

## 📊 Datos Incluidos en el Backup

El backup incluye todos los datos críticos del sistema:

- **Usuarios**: Admin, comercial, logístico
- **Clientes**: Todas las empresas registradas
- **Catálogos**:
  - Equipos (80 items)
  - Servicios (60 items)
- **Recursos**: Recursos humanos con costos por hora
- **Proveedores**: Lista completa de proveedores
- **Plantillas**: Plantillas de cotización (cuando existan)
- **Datos maestros**:
  - Unidades de medida
  - Categorías de equipos y servicios
  - Unidades de servicio

## ⚠️ Consideraciones Importantes

### Antes de Restaurar
- **Los datos existentes se eliminarán completamente**
- Asegúrate de tener un backup actualizado
- La restauración es irreversible

### Durante el Proceso
- El script muestra progreso en consola
- Se procesan las tablas en orden de dependencias
- Los errores se reportan inmediatamente

### Después de Restaurar
- Verifica que los datos se restauraron correctamente
- Las sesiones activas pueden requerir re-login
- Los IDs de registros se mantienen iguales

## 🔧 Personalización

### Cambiar Archivo de Backup
Si necesitas usar un backup específico, modifica la ruta en `scripts/restore-current-data.ts`:

```typescript
const backupPath = path.join(__dirname, '..', 'data', 'tu-archivo-personalizado.json');
```

### Agregar Nuevos Datos al Backup
Para incluir nuevas tablas o datos, actualiza:

1. La interfaz `BackupData` en ambos scripts
2. La lógica de extracción en `extract-current-data.ts`
3. La lógica de restauración en `restore-current-data.ts`

## 🚨 Solución de Problemas

### Error de Conexión a BD
```bash
# Verificar que la BD esté corriendo
npx prisma db push
```

### Archivo de Backup No Encontrado
```bash
# Ejecutar backup primero
npm run db:backup
```

### Errores de Permisos
```bash
# Asegurar permisos de escritura en carpeta data/
chmod 755 data/
```

### Errores de Prisma Client
```bash
# Regenerar cliente de Prisma
npx prisma generate
```

## 📈 Mejores Prácticas

1. **Hacer backup antes de cambios importantes**
2. **Usar datos de prueba para desarrollo inicial**
3. **Documentar cambios en datos de backup**
4. **Mantener múltiples versiones de backup**
5. **Probar restauración en entorno de staging**

## 🔗 Comandos Relacionados

```bash
# Ver estado de la BD
npx prisma studio

# Resetear completamente la BD
npx prisma migrate reset

# Aplicar cambios de schema
npx prisma db push

# Generar tipos de TypeScript
npm run generate:types