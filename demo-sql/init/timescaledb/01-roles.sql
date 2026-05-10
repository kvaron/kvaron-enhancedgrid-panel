-- Read-only role for Grafana datasource provisioning.
-- See docs/SERVER_SIDE_SETUP.md "Configuring the data source connection" —
-- the SQL connection that backs the dashboard is the security boundary,
-- and Grafana's documented model says it should never have INSERT,
-- UPDATE, or DROP privileges.

CREATE ROLE grafana_reader WITH LOGIN PASSWORD 'reader_pw';

-- Block schema-level writes explicitly. SELECT is granted per-table below
-- after the seed step.
REVOKE ALL ON DATABASE demo FROM grafana_reader;
GRANT CONNECT ON DATABASE demo TO grafana_reader;
GRANT USAGE ON SCHEMA public TO grafana_reader;
