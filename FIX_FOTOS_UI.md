# Fix: Imágenes de registros de seguridad no se renderizan en la UI

## Diagnóstico

`RegistroSeguridadFoto.urlArchivo` almacena el `webViewLink` de Google Drive
(`https://drive.google.com/file/d/XXX/view?usp=drivesdk`). Ese link requiere sesión
Google del usuario y devuelve `302 → accounts.google.com/ServiceLogin` en el browser.
Todos los `<img src={foto.urlArchivo}>` mostraban el texto alternativo.

El PPT no tenía el problema porque usa la Service Account del servidor.

## Solución

Se agregó un endpoint proxy autenticado en el servidor que descarga la imagen con la
Service Account y la sirve directamente, reutilizando el cache en disco (mismo TTL 24h
que usa el generador de PPT).

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/services/driveImageLoader.ts` | Extraída `descargarBufferDrive(driveFileId)` pública; `descargarImagenDrive` la llama internamente |
| `src/app/api/seguridad/registros/fotos/[fotoId]/contenido/route.ts` | **Nuevo** — endpoint proxy `GET` |
| `src/components/seguridad/registros/RegistroSeguridadCard.tsx` | `src` → `/api/.../contenido` |
| `src/components/seguridad/registros/GaleriaFotosSortable.tsx` | `src` y `href` → `/api/.../contenido` (lectura + drag) |
| `src/components/seguridad/reportes-semanales/SeccionCategoria.tsx` | `src` y `href` → `/api/.../contenido` |
| `scripts/smoke-test-seguridad.ts` | Escenario 11 agregado |

## Endpoint: GET /api/seguridad/registros/fotos/[fotoId]/contenido

```
Auth requerida: sesión NextAuth con rol admin | gerente | seguridad (solo propios)
Headers de respuesta:
  Content-Type: <foto.tipoArchivo ?? 'image/jpeg'>
  Cache-Control: private, max-age=3600
```

- `401` si no hay sesión
- `403` si el usuario no es dueño del registro (y no es admin/gerente)
- `404` si la foto no existe o no tiene `driveFileId`
- `502` si la descarga de Drive falla (driveFileId inválido, credenciales, etc.)

## Invariantes NO rotas

- `urlArchivo` no se modificó (sigue guardándose, es útil para audit trail y posible acceso directo futuro)
- El PPT generator (`src/lib/services/pptGenerator/`) no se tocó — sigue usando `descargarImagenesDrive` (base64)
- El cache en disco es compartido: si el PPT ya descargó una imagen, el endpoint la sirve desde cache sin ir a Drive; y viceversa

## Resultado del smoke test

```
PASS: 11  |  FAIL: 0  |  PENDING: 2
```

Escenario 11 (nuevo):
```
[PASS] 11. /contenido proxy: cache hit → buffer + image/* mimeType (8ms)
       — buffer 25B, mimeType=image/jpeg, fotoId en DB OK
```
