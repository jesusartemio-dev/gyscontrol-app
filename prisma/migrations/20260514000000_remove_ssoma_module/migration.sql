-- Drop SSOMA module: tables and enums
-- Cascade deletes handle child rows automatically

DROP TABLE IF EXISTS "ssoma_personal_habilitado";
DROP TABLE IF EXISTS "ssoma_documento";
DROP TABLE IF EXISTS "ssoma_expediente";

DROP TYPE IF EXISTS "SsomaDocTipo";
DROP TYPE IF EXISTS "SsomaParSubtipo";
DROP TYPE IF EXISTS "SsomaDocEstado";
DROP TYPE IF EXISTS "SsomaHabEstado";
