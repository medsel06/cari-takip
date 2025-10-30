-- ============================================
-- SUPABASE VERİTABANI ŞEMA ÇIKARICI
-- ============================================
-- Bu SQL sorgularını Supabase SQL Editor'de çalıştırın
-- Her sorguyu ayrı ayrı çalıştırıp sonuçları kaydedin
-- ============================================

-- 1️⃣ TÜM TABLOLAR
-- ============================================
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public', 'pgsodium', 'pgsodium_masks', 'realtime', 'supabase_functions', 'vault')
ORDER BY table_schema, table_name;

-- 2️⃣ TÜM SÜTUNLAR VE VERİ TİPLERİ
-- ============================================
SELECT
  table_schema,
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public', 'pgsodium', 'pgsodium_masks', 'realtime', 'supabase_functions', 'vault')
ORDER BY table_schema, table_name, ordinal_position;

-- 3️⃣ PRIMARY KEY'LER
-- ============================================
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
ORDER BY tc.table_schema, tc.table_name;

-- 4️⃣ FOREIGN KEY İLİŞKİLERİ
-- ============================================
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
ORDER BY tc.table_schema, tc.table_name;

-- 5️⃣ İNDEKSLER
-- ============================================
SELECT
  schemaname as table_schema,
  tablename as table_name,
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'realtime', 'supabase_functions', 'vault')
ORDER BY schemaname, tablename, indexname;

-- 6️⃣ RLS (ROW LEVEL SECURITY) POLICY'LERİ
-- ============================================
SELECT
  schemaname as table_schema,
  tablename as table_name,
  policyname as policy_name,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7️⃣ RLS DURUMU (Hangi tablolarda RLS aktif?)
-- ============================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 8️⃣ FONKSIYONLAR
-- ============================================
SELECT
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END as volatility,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'realtime', 'supabase_functions', 'vault', 'pgsodium')
ORDER BY n.nspname, p.proname;

-- 9️⃣ TRIGGER'LAR
-- ============================================
SELECT
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
ORDER BY trigger_schema, event_object_table, trigger_name;

-- 🔟 VIEW'LAR
-- ============================================
SELECT
  table_schema,
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'realtime', 'supabase_functions', 'vault')
ORDER BY table_schema, table_name;

-- 1️⃣1️⃣ ENUM TİPLERİ
-- ============================================
SELECT
  n.nspname as enum_schema,
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;

-- 1️⃣2️⃣ SEQUENCE'LAR
-- ============================================
SELECT
  schemaname as sequence_schema,
  sequencename as sequence_name,
  last_value,
  start_value,
  increment_by,
  max_value,
  min_value,
  cache_size,
  cycle
FROM pg_sequences
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
ORDER BY schemaname, sequencename;

-- 1️⃣3️⃣ UNIQUE CONSTRAINT'LER
-- ============================================
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- 1️⃣4️⃣ CHECK CONSTRAINT'LER
-- ============================================
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 1️⃣5️⃣ VERİTABANI BOYUTU VE TABLO BOYUTLARI
-- ============================================
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
  pg_stat_get_live_tuples(c.oid) AS row_count
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 1️⃣6️⃣ TABLO İSTATİSTİKLERİ
-- ============================================
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 1️⃣7️⃣ KULLANILAN EXTENSION'LAR
-- ============================================
SELECT
  extname as extension_name,
  extversion as version,
  extrelocatable as relocatable
FROM pg_extension
ORDER BY extname;

-- 1️⃣8️⃣ VERİTABANI ROLLERI VE YETKİLERİ
-- ============================================
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- 1️⃣9️⃣ TABLO BAĞIMLILIKLARI (Dependency Graph)
-- ============================================
WITH RECURSIVE dep_tree AS (
  SELECT
    c.oid,
    c.relname,
    n.nspname,
    0 AS level,
    ARRAY[c.oid] AS path
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      WHERE con.contype = 'f'
        AND con.conrelid = c.oid
    )

  UNION ALL

  SELECT
    c2.oid,
    c2.relname,
    n2.nspname,
    dt.level + 1,
    dt.path || c2.oid
  FROM dep_tree dt
  JOIN pg_constraint con ON con.confrelid = dt.oid
  JOIN pg_class c2 ON c2.oid = con.conrelid
  JOIN pg_namespace n2 ON c2.relnamespace = n2.oid
  WHERE NOT c2.oid = ANY(dt.path)
)
SELECT
  level,
  nspname as schema_name,
  relname as table_name
FROM dep_tree
ORDER BY level, relname;

-- 2️⃣0️⃣ FULL SCHEMA EXPORT (PostgreSQL DDL)
-- ============================================
-- Bu sorgu tüm tabloların CREATE TABLE statement'larını döndürür
SELECT
  'CREATE TABLE ' || table_schema || '.' || table_name || ' (' ||
  string_agg(
    column_name || ' ' || data_type ||
    CASE
      WHEN character_maximum_length IS NOT NULL
      THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE
      WHEN is_nullable = 'NO' THEN ' NOT NULL'
      ELSE ''
    END ||
    CASE
      WHEN column_default IS NOT NULL
      THEN ' DEFAULT ' || column_default
      ELSE ''
    END,
    ', '
  ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_schema, table_name
ORDER BY table_name;
