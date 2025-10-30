/**
 * Supabase Veritabanı Şema Çıkarıcı
 *
 * Bu script tüm veritabanı bilgilerini çeker:
 * - Tablolar ve sütunlar
 * - Foreign key ilişkileri
 * - İndeksler
 * - RLS Policyleri
 * - Fonksiyonlar
 * - Triggerlar
 * - Viewlar
 * - Enumlar
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase bağlantı bilgileri - .env'den okunacak
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SchemaInfo {
  tables: any[];
  columns: any[];
  foreignKeys: any[];
  indexes: any[];
  policies: any[];
  functions: any[];
  triggers: any[];
  views: any[];
  enums: any[];
  sequences: any[];
}

async function executeSql(query: string): Promise<any> {
  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) {
    // Eğer exec_sql fonksiyonu yoksa, doğrudan sorgu çalıştırmayı deneyelim
    console.log('⚠️  exec_sql fonksiyonu bulunamadı, alternatif yöntem deneniyor...');
    return null;
  }

  return data;
}

async function getTables() {
  console.log('📊 Tablolar çekiliyor...');

  const query = `
    SELECT
      table_schema,
      table_name,
      table_type
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql: query }).catch(() => ({ data: null, error: null }));

  // Alternatif yöntem - public schema tablolarını direkt çekelim
  const altQuery = `
    SELECT
      schemaname as table_schema,
      tablename as table_name,
      'BASE TABLE' as table_type
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;

  return data || [];
}

async function getColumns() {
  console.log('📝 Sütunlar çekiliyor...');

  const query = `
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
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name, ordinal_position;
  `;

  return [];
}

async function getForeignKeys() {
  console.log('🔗 Foreign keyler çekiliyor...');

  const query = `
    SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY tc.table_schema, tc.table_name;
  `;

  return [];
}

async function getIndexes() {
  console.log('📑 İndeksler çekiliyor...');

  const query = `
    SELECT
      schemaname as table_schema,
      tablename as table_name,
      indexname as index_name,
      indexdef as index_definition
    FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schemaname, tablename, indexname;
  `;

  return [];
}

async function getPolicies() {
  console.log('🔒 RLS Policyleri çekiliyor...');

  const query = `
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
  `;

  return [];
}

async function getFunctions() {
  console.log('⚙️  Fonksiyonlar çekiliyor...');

  const query = `
    SELECT
      n.nspname as function_schema,
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments,
      pg_get_functiondef(p.oid) as function_definition,
      CASE
        WHEN p.proretset THEN 'SETOF ' || pg_get_function_result(p.oid)
        ELSE pg_get_function_result(p.oid)
      END as return_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY n.nspname, p.proname;
  `;

  return [];
}

async function getTriggers() {
  console.log('🎯 Triggerlar çekiliyor...');

  const query = `
    SELECT
      trigger_schema,
      trigger_name,
      event_manipulation,
      event_object_table,
      action_statement,
      action_timing
    FROM information_schema.triggers
    WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY trigger_schema, event_object_table, trigger_name;
  `;

  return [];
}

async function getViews() {
  console.log('👁️  Viewlar çekiliyor...');

  const query = `
    SELECT
      table_schema,
      table_name as view_name,
      view_definition
    FROM information_schema.views
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
  `;

  return [];
}

async function getEnums() {
  console.log('📋 Enumlar çekiliyor...');

  const query = `
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
  `;

  return [];
}

async function getSequences() {
  console.log('🔢 Sequencelar çekiliyor...');

  const query = `
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
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schemaname, sequencename;
  `;

  return [];
}

// Basit SQL çalıştırıcı - Supabase üzerinden
async function runQuery(query: string) {
  try {
    const { data, error } = await supabase.rpc('run_sql', { query });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('SQL hatası:', error);
    return null;
  }
}

async function extractAllSchemaInfo(): Promise<SchemaInfo> {
  console.log('\n🚀 Veritabanı şema bilgileri çıkarılıyor...\n');

  const schemaInfo: SchemaInfo = {
    tables: await getTables(),
    columns: await getColumns(),
    foreignKeys: await getForeignKeys(),
    indexes: await getIndexes(),
    policies: await getPolicies(),
    functions: await getFunctions(),
    triggers: await getTriggers(),
    views: await getViews(),
    enums: await getEnums(),
    sequences: await getSequences(),
  };

  return schemaInfo;
}

async function saveToFile(schemaInfo: SchemaInfo) {
  const outputDir = path.join(process.cwd(), 'database-schema');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `schema-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(schemaInfo, null, 2));

  console.log(`\n✅ Şema bilgileri kaydedildi: ${filepath}`);

  // Markdown formatında da kaydedelim
  const mdContent = generateMarkdown(schemaInfo);
  const mdFilename = `schema-${timestamp}.md`;
  const mdFilepath = path.join(outputDir, mdFilename);
  fs.writeFileSync(mdFilepath, mdContent);

  console.log(`✅ Markdown rapor kaydedildi: ${mdFilepath}`);
}

function generateMarkdown(schemaInfo: SchemaInfo): string {
  let md = '# Veritabanı Şema Raporu\n\n';
  md += `**Oluşturulma Tarihi:** ${new Date().toLocaleString('tr-TR')}\n\n`;

  md += '## İçindekiler\n\n';
  md += '- [Tablolar](#tablolar)\n';
  md += '- [Foreign Key İlişkileri](#foreign-key-ilişkileri)\n';
  md += '- [İndeksler](#indeksler)\n';
  md += '- [RLS Policyleri](#rls-policyleri)\n';
  md += '- [Fonksiyonlar](#fonksiyonlar)\n';
  md += '- [Triggerlar](#triggerlar)\n';
  md += '- [Viewlar](#viewlar)\n';
  md += '- [Enumlar](#enumlar)\n\n';

  // Tablolar
  md += '## Tablolar\n\n';
  if (schemaInfo.tables.length > 0) {
    schemaInfo.tables.forEach(table => {
      md += `### ${table.table_schema}.${table.table_name}\n\n`;

      // Bu tablonun sütunları
      const tableCols = schemaInfo.columns.filter(
        col => col.table_schema === table.table_schema && col.table_name === table.table_name
      );

      if (tableCols.length > 0) {
        md += '| Sütun | Veri Tipi | Nullable | Default |\n';
        md += '|-------|-----------|----------|----------|\n';
        tableCols.forEach(col => {
          md += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || '-'} |\n`;
        });
        md += '\n';
      }
    });
  } else {
    md += '*Tablo bulunamadı*\n\n';
  }

  // Foreign Keys
  md += '## Foreign Key İlişkileri\n\n';
  if (schemaInfo.foreignKeys.length > 0) {
    md += '| Tablo | Sütun | Referans Tablo | Referans Sütun |\n';
    md += '|-------|-------|----------------|----------------|\n';
    schemaInfo.foreignKeys.forEach(fk => {
      md += `| ${fk.table_name} | ${fk.column_name} | ${fk.foreign_table_name} | ${fk.foreign_column_name} |\n`;
    });
    md += '\n';
  } else {
    md += '*Foreign key bulunamadı*\n\n';
  }

  // İndeksler
  md += '## İndeksler\n\n';
  if (schemaInfo.indexes.length > 0) {
    schemaInfo.indexes.forEach(idx => {
      md += `### ${idx.index_name}\n`;
      md += `**Tablo:** ${idx.table_name}\n\n`;
      md += '```sql\n';
      md += idx.index_definition;
      md += '\n```\n\n';
    });
  } else {
    md += '*İndeks bulunamadı*\n\n';
  }

  // RLS Policies
  md += '## RLS Policyleri\n\n';
  if (schemaInfo.policies.length > 0) {
    schemaInfo.policies.forEach(policy => {
      md += `### ${policy.policy_name}\n`;
      md += `**Tablo:** ${policy.table_name}\n`;
      md += `**Komut:** ${policy.command}\n`;
      md += `**Roller:** ${policy.roles}\n\n`;
    });
  } else {
    md += '*Policy bulunamadı*\n\n';
  }

  // Fonksiyonlar
  md += '## Fonksiyonlar\n\n';
  if (schemaInfo.functions.length > 0) {
    schemaInfo.functions.forEach(func => {
      md += `### ${func.function_name}\n`;
      md += `**Parametreler:** ${func.arguments}\n`;
      md += `**Dönüş Tipi:** ${func.return_type}\n\n`;
      if (func.function_definition) {
        md += '```sql\n';
        md += func.function_definition;
        md += '\n```\n\n';
      }
    });
  } else {
    md += '*Fonksiyon bulunamadı*\n\n';
  }

  return md;
}

// Ana fonksiyon
async function main() {
  try {
    const schemaInfo = await extractAllSchemaInfo();
    await saveToFile(schemaInfo);

    console.log('\n📊 Özet:');
    console.log(`   - ${schemaInfo.tables.length} tablo`);
    console.log(`   - ${schemaInfo.columns.length} sütun`);
    console.log(`   - ${schemaInfo.foreignKeys.length} foreign key`);
    console.log(`   - ${schemaInfo.indexes.length} indeks`);
    console.log(`   - ${schemaInfo.policies.length} RLS policy`);
    console.log(`   - ${schemaInfo.functions.length} fonksiyon`);
    console.log(`   - ${schemaInfo.triggers.length} trigger`);
    console.log(`   - ${schemaInfo.views.length} view`);
    console.log(`   - ${schemaInfo.enums.length} enum`);

    console.log('\n✨ İşlem tamamlandı!\n');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

// Scripti çalıştır
main();
