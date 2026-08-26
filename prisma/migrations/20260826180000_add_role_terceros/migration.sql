-- Rol `terceros`: personal eventual/tercero. Solo marca asistencia y puede
-- ser agregado a jornadas de campo — ver DEFAULT_ROLE_SECTIONS['terceros']
-- en src/lib/config/sections.ts (única sección: mi-trabajo).
ALTER TYPE "Role" ADD VALUE 'terceros';
