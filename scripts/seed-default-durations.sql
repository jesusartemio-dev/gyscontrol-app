-- Insert default duration templates
INSERT INTO plantilla_duracion_cronograma (id, tipoProyecto, nivel, duracionDias, horasPorDia, bufferPorcentaje, activo, createdAt, updatedAt) VALUES
-- Construcción
(gen_random_uuid(), 'construccion', 'fase', 30, 8, 15, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'edt', 15, 8, 10, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'actividad', 3, 8, 5, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'tarea', 1, 8, 3, true, NOW(), NOW()),

-- Instalación
(gen_random_uuid(), 'instalacion', 'fase', 20, 8, 12, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'edt', 10, 8, 8, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'actividad', 2, 8, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'tarea', 0.5, 8, 2, true, NOW(), NOW()),

-- Mantenimiento
(gen_random_uuid(), 'mantenimiento', 'fase', 10, 8, 10, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'edt', 5, 8, 7, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'actividad', 1, 8, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'tarea', 0.25, 8, 1, true, NOW(), NOW())

ON CONFLICT (tipoProyecto, nivel) DO NOTHING;