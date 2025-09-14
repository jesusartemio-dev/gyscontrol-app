-- First, add the new enum value
ALTER TYPE "EstadoTarea" ADD VALUE 'en_progreso';

-- Update existing records from 'en_proceso' to 'en_progreso'
UPDATE "tareas" SET "estado" = 'en_progreso' WHERE "estado" = 'en_proceso';
UPDATE "subtareas" SET "estado" = 'en_progreso' WHERE "estado" = 'en_proceso';

-- Note: PostgreSQL doesn't support removing enum values directly
-- The old 'en_proceso' value will remain in the enum but won't be used