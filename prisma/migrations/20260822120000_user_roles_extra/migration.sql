-- Multi-rol: roles adicionales al principal.
-- Los permisos efectivos son la UNIÓN de "role" y "rolesExtra".
-- Vacío (el default) = comportamiento idéntico al de un solo rol, por eso
-- esta migración es segura de aplicar antes de desplegar el código.
--
-- Nota: la tabla es "user" en minúscula (@@map("user") en el modelo Prisma),
-- no "User" como la creó la migración init. Ver el drift documentado del
-- historial de migraciones.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "rolesExtra" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[];
