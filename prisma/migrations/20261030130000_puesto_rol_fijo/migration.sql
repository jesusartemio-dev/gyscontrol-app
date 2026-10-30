-- `rolFuncional` dice qué EDTs responde un puesto y lo comparten varios
-- (Supervisor de Proyecto y Coordinador de Ingeniería son ambos 'residente').
-- Usarlo también para decidir quién ocupa el nodo hacía que los tres puestos
-- 'residente' recibieran la misma persona, el titular de liderId.
-- `rolFijoProyecto` es exclusivo: solo un puesto por valor.
ALTER TABLE "puesto" ADD COLUMN IF NOT EXISTS "rolFijoProyecto" TEXT;

UPDATE "puesto" SET "rolFijoProyecto" = 'gestor'     WHERE "nombre" = 'Gestor de Proyectos';
UPDATE "puesto" SET "rolFijoProyecto" = 'supervisor' WHERE "nombre" = 'Supervisor de Campo';
UPDATE "puesto" SET "rolFijoProyecto" = 'lider'      WHERE "nombre" = 'Supervisor de Proyecto';
UPDATE "puesto" SET "rolFijoProyecto" = 'comercial'  WHERE "nombre" = 'Comercial';
