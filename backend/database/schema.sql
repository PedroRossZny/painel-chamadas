-- Tables used by the backend. Run once on an empty PostgreSQL database:
-- psql -d painel_chamadas -f database/schema.sql

-- A waiting area with its own TV panel (e.g. the main reception).
CREATE TABLE area (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- A room inside an area. The name is spoken after "dirigir-se ao",
-- so it reads best as a masculine noun ("Consultório 1").
CREATE TABLE sector (
  id      SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES area (id),
  name    TEXT NOT NULL
);

-- One call made by a professional. It goes from waiting to calling,
-- then to called, or to no_show after three attempts or five minutes.
CREATE TABLE call (
  id             SERIAL PRIMARY KEY,
  patient_name   TEXT NOT NULL,
  doctor_name    TEXT NOT NULL,
  sector_id      INTEGER NOT NULL REFERENCES sector (id),
  status         TEXT NOT NULL DEFAULT 'waiting'
                 CHECK (status IN ('waiting', 'calling', 'called', 'no_show')),
  call_attempts  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at     TIMESTAMPTZ,
  last_called_at TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ
);

-- Each announcement played on a panel. Only one can be playing per area.
CREATE TABLE audio_queue (
  id         SERIAL PRIMARY KEY,
  call_id    INTEGER NOT NULL REFERENCES call (id),
  status     TEXT NOT NULL CHECK (status IN ('playing', 'done')),
  audio_text TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patients that were called at least once. Source of the daily PDF report.
CREATE TABLE attended_patient (
  id           SERIAL PRIMARY KEY,
  call_id      INTEGER NOT NULL UNIQUE REFERENCES call (id),
  patient_name TEXT NOT NULL,
  doctor_name  TEXT NOT NULL,
  sector_id    INTEGER NOT NULL REFERENCES sector (id),
  attended_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX call_sector_status_idx ON call (sector_id, status, created_at);
CREATE INDEX audio_queue_status_idx ON audio_queue (status);
