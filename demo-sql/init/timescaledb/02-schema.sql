-- Demo schema: simulated e-commerce orders. Mirrors the SQL Server schema
-- one-for-one so both dialects exercise identical columns + values.

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS orders (
  id            BIGSERIAL    PRIMARY KEY,
  customer_name TEXT         NOT NULL,
  status        TEXT         NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  region        TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders (status);
CREATE INDEX IF NOT EXISTS orders_region_idx     ON orders (region);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at);
-- Functional index supports the panel's ansi-style LOWER(customer_name) = LOWER(...)
-- equals fragment (kept locally as a defense-in-depth example even though
-- this datasource is postgres-dialect, which uses ILIKE for the fuzzy ops).
CREATE INDEX IF NOT EXISTS orders_customer_lower_idx ON orders (LOWER(customer_name));
