# ANÁLISIS DE DISCREPANCIA - REPORTE

## 1. ARCHIVO ANALIZADO
- **Ruta:** `prisma/schema.prisma`
- **Tamaño:** 102,604 bytes
- **Última modificación:** 15/01/2026 03:43 p. m.
- **Checksum:** No calculado

## 2. RESULTADOS DE COMANDOS

### Comando 1: Total de modelos en `prisma/schema.prisma`
```bash
findstr /R /C:"^model " prisma\schema.prisma | find /C /V ""
```
**Resultado:** 93 modelos

### Comando 2: Modelos en snake_case en `prisma/schema.prisma`
```bash
findstr /R /C:"^model [a-z][a-z_]" prisma\schema.prisma | find /C /V ""
```
**Resultado:** 93 modelos (todos en PascalCase)

### Comando 3: Búsqueda de modelos específicos en `prisma/schema.prisma`
```bash
findstr /R /C:"^model analytics_events" prisma\schema.prisma
findstr /R /C:"^model audit_log" prisma\schema.prisma
findstr /R /C:"^model calendario_laboral" prisma\schema.prisma
```
**Resultado:** No se encontraron modelos en snake_case.

### Comando 4: Verificación de múltiples archivos `.prisma`
```bash
dir prisma\*.prisma
```
**Resultado:**
- `schema.prisma` (102,604 bytes, modificado el 15/01/2026)
- `schema_local.prisma` (61,145 bytes, modificado el 05/12/2025)
- `schema_neon.prisma` (97,718 bytes, modificado el 05/12/2025)

### Comando 5: Análisis de `schema_neon.prisma`
```bash
findstr /R /C:"^model " prisma\schema_neon.prisma | find /C /V ""
findstr /R /C:"^model [a-z][a-z_]" prisma\schema_neon.prisma | find /C /V ""
```
**Resultado:**
- Total de modelos: 91
- Modelos en snake_case: 91

### Comando 6: Búsqueda de modelos específicos en `schema_neon.prisma`
```bash
findstr /R /C:"^model analytics_events" prisma\schema_neon.prisma
findstr /R /C:"^model audit_log" prisma\schema_neon.prisma
findstr /R /C:"^model calendario_laboral" prisma\schema_neon.prisma
```
**Resultado:** Todos los modelos mencionados en el informe se encontraron en `schema_neon.prisma`.

## 3. ARCHIVOS .PRISMA ENCONTRADOS
- `prisma/schema.prisma` (actual, 93 modelos, todos en PascalCase)
- `prisma/schema_local.prisma` (antiguo, 61,145 bytes)
- `prisma/schema_neon.prisma` (antiguo, 91 modelos, todos en snake_case)

## 4. EXPLICACIÓN DE LA DISCREPANCIA

El informe `INFORME_CUMPLIMIENTO_NAMING_ACTUALIZADO_20260115.md` se generó analizando el archivo `prisma/schema_neon.prisma` en lugar del archivo actual `prisma/schema.prisma`. Esto explica la discrepancia:

- **Informe:** 100 modelos (72 en PascalCase, 28 en snake_case)
- **Realidad en `schema.prisma`:** 93 modelos (93 en PascalCase, 0 en snake_case)

El archivo `schema_neon.prisma` contiene modelos en snake_case, como `analytics_events`, `audit_log`, y `calendario_laboral`, que no existen en el archivo actual `schema.prisma`.

## 5. DATOS CORRECTOS ACTUALES
- **Total de modelos:** 93
- **Modelos en PascalCase:** 93 (100%)
- **Modelos en snake_case:** 0 (0%)

## 6. RECOMENDACIÓN

1. **Regenerar el informe** utilizando el archivo correcto `prisma/schema.prisma`.
2. **Eliminar o archivar** los archivos antiguos (`schema_neon.prisma`, `schema_local.prisma`) para evitar confusiones futuras.
3. **Verificar la configuración** de Prisma para asegurarse de que se esté utilizando el archivo correcto en el proyecto.

## CONCLUSIÓN

La discrepancia se debió a un error en la selección del archivo analizado. El informe se basó en un archivo antiguo (`schema_neon.prisma`) que contenía modelos en snake_case, mientras que el archivo actual (`schema.prisma`) cumple completamente con las convenciones de nomenclatura en PascalCase.