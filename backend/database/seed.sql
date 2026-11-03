-- Example areas and rooms to try the system:
-- psql -d painel_chamadas -f database/seed.sql

INSERT INTO area (name) VALUES
  ('Recepção Principal'),
  ('Odontologia');

INSERT INTO sector (area_id, name)
SELECT area.id, room.name
FROM (VALUES
  (1, 'Recepção Principal', 'Consultório 1'),
  (2, 'Recepção Principal', 'Consultório 2'),
  (3, 'Recepção Principal', 'Consultório 3'),
  (4, 'Odontologia', 'Consultório Odontológico')
) AS room (position, area_name, name)
JOIN area ON area.name = room.area_name
ORDER BY room.position;
