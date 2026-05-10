-- Pure-SQL seed: 10,000 orders generated via generate_series. Tunable by
-- editing the upper bound below; 10k is enough to make server-side
-- pagination meaningful without dragging out first-up time.

WITH params AS (
  SELECT
    ARRAY['pending', 'paid', 'shipped', 'cancelled']                     AS statuses,
    ARRAY['west', 'east', 'north', 'south', 'central']                   AS regions,
    -- Generic placeholder store names. The last three intentionally
    -- carry SQL-escape edge-case characters (apostrophe, Unicode
    -- diacritic, parenthesized %) so the seeded data exercises the
    -- escape paths in real queries.
    ARRAY[
      'Store 01', 'Store 02', 'Store 03', 'Store 04', 'Store 05',
      'Store 06', 'Store 07', 'Store 08', 'Store 09', 'Store 10',
      'Store 11', 'Store 12',
      'Store 13 O''Special', 'Store 14 Ümlaut', 'Store 15 (50% off)'
    ] AS names
)
INSERT INTO orders (customer_name, status, amount, region, created_at, notes)
SELECT
  (SELECT names[1 + (random() * (array_length(names, 1) - 1))::int]
     FROM params),
  (SELECT statuses[1 + (random() * (array_length(statuses, 1) - 1))::int]
     FROM params),
  ROUND((10 + random() * 5000)::numeric, 2),
  (SELECT regions[1 + (random() * (array_length(regions, 1) - 1))::int]
     FROM params),
  NOW() - (random() * INTERVAL '180 days'),
  CASE WHEN random() < 0.15 THEN NULL ELSE 'auto-generated demo row' END
FROM generate_series(1, 10000);

-- Now grant the read-only role exactly the SELECT it needs — and nothing
-- else. Future tables added to public won't be auto-granted to the role.
GRANT SELECT ON TABLE orders TO grafana_reader;
