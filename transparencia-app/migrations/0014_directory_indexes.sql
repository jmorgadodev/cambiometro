-- Índices para la consulta paginada del directorio universal.
-- La tabla ya existe en instalaciones antiguas; la migración es idempotente.
CREATE INDEX IF NOT EXISTS idx_funcionarios_nombre ON funcionarios_publicos(nombre_completo COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_funcionarios_cargo ON funcionarios_publicos(cargo COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_funcionarios_contrato_estamento ON funcionarios_publicos(tipo_contrato, estamento);
