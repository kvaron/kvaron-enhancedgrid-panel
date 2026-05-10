-- SQL Server seed: matches the TimescaleDB schema one-for-one so both
-- dialects exercise the same columns + value distribution.

USE master;
GO

IF DB_ID('demo') IS NULL CREATE DATABASE demo;
GO

USE demo;
GO

IF OBJECT_ID('dbo.orders', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.orders (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_name NVARCHAR(200) NOT NULL,
    status        NVARCHAR(20)  NOT NULL,
    amount        DECIMAL(10,2) NOT NULL,
    region        NVARCHAR(20)  NOT NULL,
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    notes         NVARCHAR(MAX)
  );
  CREATE INDEX orders_status_idx     ON dbo.orders (status);
  CREATE INDEX orders_region_idx     ON dbo.orders (region);
  CREATE INDEX orders_created_at_idx ON dbo.orders (created_at);
END
GO

-- Bulk-insert 10,000 rows via a WHILE loop. T-SQL doesn't have
-- generate_series; this loop is set-friendly enough for 10k rows in a few
-- seconds. Insert in batches of 1,000 to keep transaction log pressure
-- reasonable.
SET NOCOUNT ON;
DECLARE @batch INT = 0;
WHILE @batch < 10
BEGIN
  ;WITH n(num) AS (
    SELECT 1
    UNION ALL
    SELECT num + 1 FROM n WHERE num < 1000
  )
  INSERT INTO dbo.orders (customer_name, status, amount, region, created_at, notes)
  SELECT
    -- Generic placeholder store names. The last three intentionally
    -- carry SQL-escape edge-case characters (apostrophe, Unicode
    -- diacritic, parenthesized %) so the seeded data exercises the
    -- escape paths in real queries.
    CASE ABS(CHECKSUM(NEWID())) % 15
      WHEN 0 THEN 'Store 01'
      WHEN 1 THEN 'Store 02'
      WHEN 2 THEN 'Store 03'
      WHEN 3 THEN 'Store 04'
      WHEN 4 THEN 'Store 05'
      WHEN 5 THEN 'Store 06'
      WHEN 6 THEN 'Store 07'
      WHEN 7 THEN 'Store 08'
      WHEN 8 THEN 'Store 09'
      WHEN 9 THEN 'Store 10'
      WHEN 10 THEN 'Store 11'
      WHEN 11 THEN 'Store 12'
      WHEN 12 THEN N'Store 13 O''Special'
      WHEN 13 THEN N'Store 14 Ümlaut'
      ELSE 'Store 15 (50% off)'
    END,
    CASE ABS(CHECKSUM(NEWID())) % 4
      WHEN 0 THEN 'pending'
      WHEN 1 THEN 'paid'
      WHEN 2 THEN 'shipped'
      ELSE 'cancelled'
    END,
    CAST(10 + ABS(CHECKSUM(NEWID())) % 499000 / 100.0 AS DECIMAL(10,2)),
    CASE ABS(CHECKSUM(NEWID())) % 5
      WHEN 0 THEN 'west'
      WHEN 1 THEN 'east'
      WHEN 2 THEN 'north'
      WHEN 3 THEN 'south'
      ELSE 'central'
    END,
    DATEADD(MINUTE, -ABS(CHECKSUM(NEWID())) % 259200, SYSUTCDATETIME()),
    CASE WHEN ABS(CHECKSUM(NEWID())) % 100 < 15 THEN NULL ELSE 'auto-generated demo row' END
  FROM n
  OPTION (MAXRECURSION 1000);
  SET @batch = @batch + 1;
END
GO

-- Create the read-only login + user. Grafana datasource uses these.
IF SUSER_ID('grafana_reader') IS NULL
  CREATE LOGIN grafana_reader WITH PASSWORD = N'ReaderP@ss1', CHECK_POLICY = OFF;
GO

USE demo;
GO
IF USER_ID('grafana_reader') IS NULL CREATE USER grafana_reader FOR LOGIN grafana_reader;
GO

GRANT SELECT ON dbo.orders TO grafana_reader;
-- Explicit DENY of writes covers the case where a future role inheritance
-- accidentally grants them.
DENY INSERT, UPDATE, DELETE, ALTER, CONTROL ON dbo.orders TO grafana_reader;
GO
