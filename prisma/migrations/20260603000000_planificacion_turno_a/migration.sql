-- Habilitar turnos A/B/C en la planificación.
-- Hasta ahora todas las celdas usaban el turno legacy 'dia_completo'.
-- Lo migramos al nuevo 'turno_a' (Día) y cambiamos el default de la columna.
-- turno_b (Tarde/Noche) y turno_c (Noche) se asignan desde la app.

UPDATE "planificacion_dia" SET "turno" = 'turno_a' WHERE "turno" = 'dia_completo';

ALTER TABLE "planificacion_dia" ALTER COLUMN "turno" SET DEFAULT 'turno_a';
