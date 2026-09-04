-- Rol `rrhh`: personal y asistencia como rol independiente de `administracion`
-- (que hoy también ve la sección RRHH, pero además Cuentas por Cobrar/Pagar
-- y Facturación). Pensado para asignarse como rolesExtra junto a otro rol
-- principal (multi-rol) — ver src/lib/config/sections.ts DEFAULT_ROLE_SECTIONS['rrhh'].
ALTER TYPE "Role" ADD VALUE 'rrhh';
