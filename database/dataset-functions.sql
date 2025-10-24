-- Database metadata functions for dataset page
-- These functions help retrieve complete database schema information

-- 1. Get all tables with row counts and sizes
CREATE OR REPLACE FUNCTION get_all_tables(schema_name TEXT DEFAULT 'public')
RETURNS TABLE (
    schema TEXT,
    table_name TEXT,
    table_type TEXT,
    row_count BIGINT,
    size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_schema::TEXT,
        t.table_name::TEXT,
        t.table_type::TEXT,
        (SELECT COUNT(*)::BIGINT FROM information_schema.tables AS dummy WHERE dummy.table_name = t.table_name),
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name)))::TEXT
    FROM information_schema.tables t
    WHERE t.table_schema = schema_name
        AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get columns for a specific table
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT, p_schema_name TEXT DEFAULT 'public')
RETURNS TABLE (
    table_schema TEXT,
    table_name TEXT,
    column_name TEXT,
    ordinal_position INT,
    column_default TEXT,
    is_nullable TEXT,
    data_type TEXT,
    character_maximum_length INT,
    numeric_precision INT,
    numeric_scale INT,
    is_identity TEXT,
    is_generated TEXT,
    generation_expression TEXT,
    udt_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.table_schema::TEXT,
        c.table_name::TEXT,
        c.column_name::TEXT,
        c.ordinal_position::INT,
        c.column_default::TEXT,
        c.is_nullable::TEXT,
        c.data_type::TEXT,
        c.character_maximum_length::INT,
        c.numeric_precision::INT,
        c.numeric_scale::INT,
        c.is_identity::TEXT,
        c.is_generated::TEXT,
        c.generation_expression::TEXT,
        c.udt_name::TEXT
    FROM information_schema.columns c
    WHERE c.table_schema = p_schema_name
        AND c.table_name = p_table_name
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get constraints for a specific table
CREATE OR REPLACE FUNCTION get_table_constraints(p_table_name TEXT, p_schema_name TEXT DEFAULT 'public')
RETURNS TABLE (
    constraint_schema TEXT,
    constraint_name TEXT,
    table_schema TEXT,
    table_name TEXT,
    constraint_type TEXT,
    is_deferrable TEXT,
    initially_deferred TEXT,
    enforced TEXT,
    column_name TEXT,
    foreign_table_schema TEXT,
    foreign_table_name TEXT,
    foreign_column_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.constraint_schema::TEXT,
        tc.constraint_name::TEXT,
        tc.table_schema::TEXT,
        tc.table_name::TEXT,
        tc.constraint_type::TEXT,
        tc.is_deferrable::TEXT,
        tc.initially_deferred::TEXT,
        tc.enforced::TEXT,
        kcu.column_name::TEXT,
        ccu.table_schema::TEXT AS foreign_table_schema,
        ccu.table_name::TEXT AS foreign_table_name,
        ccu.column_name::TEXT AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
        AND ccu.constraint_name != kcu.constraint_name -- Avoid self-joins for non-FK constraints
    WHERE tc.table_schema = p_schema_name
        AND tc.table_name = p_table_name
    ORDER BY tc.constraint_type, tc.constraint_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get indexes for a specific table
CREATE OR REPLACE FUNCTION get_table_indexes(p_table_name TEXT, p_schema_name TEXT DEFAULT 'public')
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    indexdef TEXT,
    tablespace TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.schemaname::TEXT,
        i.tablename::TEXT,
        i.indexname::TEXT,
        i.indexdef::TEXT,
        i.tablespace::TEXT
    FROM pg_indexes i
    WHERE i.schemaname = p_schema_name
        AND i.tablename = p_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get triggers for a specific table
CREATE OR REPLACE FUNCTION get_table_triggers(p_table_name TEXT, p_schema_name TEXT DEFAULT 'public')
RETURNS TABLE (
    trigger_schema TEXT,
    trigger_name TEXT,
    event_manipulation TEXT,
    event_object_schema TEXT,
    event_object_table TEXT,
    action_order INT,
    action_condition TEXT,
    action_statement TEXT,
    action_orientation TEXT,
    action_timing TEXT,
    created TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trigger_schema::TEXT,
        t.trigger_name::TEXT,
        t.event_manipulation::TEXT,
        t.event_object_schema::TEXT,
        t.event_object_table::TEXT,
        t.action_order::INT,
        t.action_condition::TEXT,
        t.action_statement::TEXT,
        t.action_orientation::TEXT,
        t.action_timing::TEXT,
        t.created::TEXT
    FROM information_schema.triggers t
    WHERE t.event_object_schema = p_schema_name
        AND t.event_object_table = p_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Get RLS policies for a specific table
CREATE OR REPLACE FUNCTION get_table_policies(p_table_name TEXT, p_schema_name TEXT DEFAULT 'public')
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    policyname TEXT,
    permissive TEXT,
    roles TEXT[],
    cmd TEXT,
    qual TEXT,
    with_check TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pol.schemaname::TEXT,
        pol.tablename::TEXT,
        pol.policyname::TEXT,
        pol.permissive::TEXT,
        pol.roles::TEXT[],
        pol.cmd::TEXT,
        pol.qual::TEXT,
        pol.with_check::TEXT
    FROM pg_policies pol
    WHERE pol.schemaname = p_schema_name
        AND pol.tablename = p_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Execute raw SQL (for fallback queries)
CREATE OR REPLACE FUNCTION raw_sql(query TEXT)
RETURNS SETOF RECORD AS $$
BEGIN
    RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_all_tables(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_columns(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_constraints(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_indexes(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_triggers(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_policies(TEXT, TEXT) TO authenticated;

-- Optional: Create a comprehensive view for all foreign key relationships
CREATE OR REPLACE VIEW foreign_key_relationships AS
SELECT 
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Grant select permission on the view
GRANT SELECT ON foreign_key_relationships TO authenticated;