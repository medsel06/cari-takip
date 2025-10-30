/**
 * Basit Veritabanı Şema Çıkarıcı
 *
 * Kullanım:
 * node scripts/extract-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env dosyasını oku (varsa)
try {
  require('dotenv').config();
} catch (err) {
  console.log('⚠️  dotenv bulunamadı, environment variables kullanılacak');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Hata: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli!');
  console.error('   .env dosyanızı kontrol edin.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL sorgularını çalıştır
async function runQuery(name, query) {
  console.log(`📊 ${name} çekiliyor...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });

    if (error) {
      console.log(`   ⚠️  exec_sql kullanılamadı, alternatif yöntem deneniyor...`);
      // Alternatif: from() kullan
      return null;
    }

    console.log(`   ✅ ${data?.length || 0} kayıt bulundu`);
    return data;
  } catch (error) {
    console.log(`   ❌ Hata: ${error.message}`);
    return null;
  }
}

// Tüm public tabloları çek
async function getTablesSimple() {
  console.log('📊 Tablolar listeleniyor...');

  try {
    // PostgreSQL system catalog kullanarak direkt çekelim
    const { data, error } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');

    if (error) {
      console.log('   ⚠️  pg_tables erişilemedi, RPC deneniyor...');
      return null;
    }

    console.log(`   ✅ ${data?.length || 0} tablo bulundu`);
    return data;
  } catch (error) {
    console.log(`   ❌ Hata: ${error.message}`);
    return null;
  }
}

// Her tablo için sütunları çek
async function getTableColumns(tableName) {
  try {
    // Supabase metadata endpoint kullanarak
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      return null;
    }

    // İlk satırdan sütun isimlerini al
    if (data && data.length > 0) {
      return Object.keys(data[0]);
    }

    return [];
  } catch (error) {
    return null;
  }
}

// Ana fonksiyon
async function main() {
  console.log('\n🚀 Supabase Veritabanı Şema Çıkarıcı\n');
  console.log('=' .repeat(50));

  const result = {
    extracted_at: new Date().toISOString(),
    database_url: supabaseUrl,
    tables: [],
    summary: {}
  };

  // Basit yöntemle tabloları çek
  console.log('\n1️⃣  TABLOLAR\n');

  // Bilinen tablolardan örnekle (eğer pg_tables erişilemezse)
  const knownTables = [
    'users', 'companies', 'customers', 'products', 'sales', 'purchases',
    'stocks', 'stock_movements', 'account_movements', 'checks',
    'cash_accounts', 'cash_movements', 'categories'
  ];

  for (const tableName of knownTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`   ✅ ${tableName} (${count} kayıt)`);

        // Sütunları da çek
        const columns = await getTableColumns(tableName);

        result.tables.push({
          name: tableName,
          row_count: count,
          columns: columns || []
        });
      }
    } catch (error) {
      // Tablo yoksa geç
    }
  }

  result.summary = {
    total_tables: result.tables.length,
    total_columns: result.tables.reduce((sum, t) => sum + (t.columns?.length || 0), 0)
  };

  // Sonuçları kaydet
  console.log('\n📝 Sonuçlar kaydediliyor...\n');

  const outputDir = path.join(__dirname, '..', 'database-schema');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `schema-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  console.log(`   ✅ JSON: ${filepath}`);

  // Markdown da oluştur
  let markdown = '# Veritabanı Şema Raporu\n\n';
  markdown += `**Tarih:** ${new Date().toLocaleString('tr-TR')}\n\n`;
  markdown += `## Özet\n\n`;
  markdown += `- **Toplam Tablo:** ${result.summary.total_tables}\n`;
  markdown += `- **Toplam Sütun:** ${result.summary.total_columns}\n\n`;

  markdown += `## Tablolar\n\n`;
  result.tables.forEach(table => {
    markdown += `### ${table.name}\n\n`;
    markdown += `**Kayıt Sayısı:** ${table.row_count}\n\n`;

    if (table.columns && table.columns.length > 0) {
      markdown += `**Sütunlar:**\n`;
      markdown += table.columns.map(col => `- ${col}`).join('\n');
      markdown += '\n\n';
    }
  });

  const mdFilename = `schema-${timestamp}.md`;
  const mdFilepath = path.join(outputDir, mdFilename);
  fs.writeFileSync(mdFilepath, markdown);
  console.log(`   ✅ Markdown: ${mdFilepath}`);

  console.log('\n✨ Tamamlandı!\n');
  console.log('=' .repeat(50));
  console.log(`\n📊 Özet:`);
  console.log(`   - ${result.summary.total_tables} tablo bulundu`);
  console.log(`   - ${result.summary.total_columns} sütun bulundu`);
  console.log('\n💡 İpucu: Daha detaylı bilgi için SQL sorgularını');
  console.log('   Supabase SQL Editor\'de çalıştırabilirsiniz:');
  console.log('   scripts/database-queries.sql\n');
}

main().catch(error => {
  console.error('❌ Beklenmeyen hata:', error);
  process.exit(1);
});
