-- Fixture mínimo y determinista para validar el artefacto Worker en CI.
-- Los datos de producción nunca se copian al repositorio.

INSERT OR REPLACE INTO sources (id,label,organization,official_url,license,expected_coverage)
VALUES ('camara','Cámara de Diputadas y Diputados','Congreso Nacional','https://www.camara.cl/','Datos públicos oficiales','Autoridades y actividad parlamentaria');

INSERT OR REPLACE INTO entities (id,kind,name,identifiers_json,attributes_json,source_ids_json,updated_at) VALUES
('person-camara-1009','person','Persona de prueba Cámara','[{"scheme":"camara","value":"1009"}]','{"chamber":"camara"}','["camara"]',CURRENT_TIMESTAMP),
('person-camara-1218','person','José Antonio Kast Adriasola','[{"scheme":"camara","value":"1218"}]','{"chamber":"camara"}','["camara"]',CURRENT_TIMESTAMP),
('person-test-1','person','Persona de prueba General','[]','{}','["infoprobidad"]',CURRENT_TIMESTAMP),
('person-infoprobidad-9204ac804e1f43cc8c3e62f712a15764','person','Persona InfoProbidad','[]','{}','["infoprobidad"]',CURRENT_TIMESTAMP),
('public-body-camara','public_body','Cámara de Diputadas y Diputados','[]','{"country":"CL"}','["camara"]',CURRENT_TIMESTAMP),
('public-body-cgr','public_body','Contraloría General de la República','[]','{"country":"CL"}','["contraloria"]',CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO funcionarios_publicos (
  id, rut, nombre_completo, organo_id, organo_tipo, cargo, estamento,
  tipo_contrato, remuneracion_bruta_mensual, fecha_ingreso
) VALUES (
  'fixture-funcionario-1', '11.111.111-1', 'Funcionario de prueba',
  'muni-santiago', 'municipalidad', 'Profesional de prueba', 'Profesional',
  'Contrata', 1500000, '2026-01-02'
);

INSERT OR REPLACE INTO records (id,kind,source_id,title,description,occurred_at,period_json,subject_entity_ids_json,object_entity_ids_json,amount_json,evidence_json,data_json)
VALUES (
  'fixture-vote-camara-1009',
  'vote',
  'camara',
  'Votación de integración',
  'Registro mínimo para verificar D1 y la cadena de evidencia en CI.',
  CURRENT_TIMESTAMP,
  '{"from":"2026-08-12","to":"2026-08-12","label":"2026-08"}',
  '["person-camara-1009"]',
  '["public-body-camara"]',
  NULL,
  '[{"url":"https://www.camara.cl/","sourceId":"camara","label":"Cámara"}]',
  '{"option":"A favor","fixture":true}'
), (
  'fixture-dec-test-1',
  'declaration',
  'infoprobidad',
  'Declaración de patrimonio',
  'Registro para verificar ficha continua de persona en CI.',
  CURRENT_TIMESTAMP,
  '{"from":"2026-08-12","to":"2026-08-12","label":"2026-08"}',
  '["person-test-1"]',
  '[]',
  NULL,
  '[{"url":"https://datos.cplt.cl/","sourceId":"infoprobidad","label":"InfoProbidad"}]',
  '{}'
), (
  'fixture-dec-probidad-1',
  'declaration',
  'infoprobidad',
  'Declaración de patrimonio InfoProbidad',
  'Registro para verificar ficha de persona InfoProbidad en CI.',
  CURRENT_TIMESTAMP,
  '{"from":"2026-08-12","to":"2026-08-12","label":"2026-08"}',
  '["person-infoprobidad-9204ac804e1f43cc8c3e62f712a15764"]',
  '[]',
  NULL,
  '[{"url":"https://datos.cplt.cl/","sourceId":"infoprobidad","label":"InfoProbidad"}]',
  '{}'
);

INSERT OR REPLACE INTO record_subjects (record_id,entity_id)
VALUES ('fixture-vote-camara-1009','person-camara-1009');

INSERT OR REPLACE INTO record_objects (record_id,entity_id)
VALUES ('fixture-vote-camara-1009','public-body-camara');

INSERT OR REPLACE INTO relations (id,from_id,predicate,to_id,evidence_record_ids_json,period_json,reconciliation_json,disclaimer)
VALUES (
  'fixture-relation-camara-1009',
  'person-camara-1009',
  'cast_vote',
  'public-body-camara',
  '["fixture-vote-camara-1009"]',
  '{"from":"2026-08-12","to":"2026-08-12","label":"2026-08"}',
  '{"method":"official_id","confidence":1}',
  'La relación documental no implica irregularidad ni responsabilidad.'
);

INSERT OR REPLACE INTO etl_runs (id,cadence,status,started_at,finished_at,catalog_version,catalog_checksum,source_count,record_count,error)
VALUES ('ci-browser-fixture','test','success',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'ci-fixture','ci-fixture',1,1,NULL);

INSERT OR REPLACE INTO source_state (source_id,etl_run_id,status,record_count,checksum_sha256,generated_at,last_success_at,error,published_version,updated_at)
VALUES ('camara','ci-browser-fixture','connected',1,'ci-fixture',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,NULL,'ci-fixture',CURRENT_TIMESTAMP);
