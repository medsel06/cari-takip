// Test verisi ekleme scripti
// Bu dosyayı tarayıcı konsolunda çalıştırabilirsiniz

async function addTestCustomers() {
  const supabaseUrl = 'https://uozjjgbslruduhrbswyx.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvempqZ2JzbHJ1ZHVocmJzd3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTkwNjksImV4cCI6MjA3MTg5NTA2OX0.V65_T26e38qGiRZGyaMY_lVpaVXUaZVgDa5xjaW3BsM';
  
  // Test müşteriler/tedarikçiler
  const testCustomers = [
    {
      code: 'TED001',
      name: 'Ahmet Metal Ltd. Şti.',
      type: 'supplier',
      phone: '0212 555 1234',
      email: 'ahmet@metal.com',
      city: 'İstanbul',
      is_active: true,
      company_id: 'd0c63e2a-5e4d-4e9a-be7d-1f9b3c8d9e8a' // Buraya kendi company_id'nizi yazın
    },
    {
      code: 'TED002',
      name: 'Demir Çelik A.Ş.',
      type: 'supplier',
      phone: '0216 444 5678',
      email: 'info@demircelik.com',
      city: 'İstanbul',
      is_active: true,
      company_id: 'd0c63e2a-5e4d-4e9a-be7d-1f9b3c8d9e8a'
    },
    {
      code: 'MUS001',
      name: 'Ali Yapı Market',
      type: 'customer',
      phone: '0212 333 9876',
      email: 'ali@yapimarket.com',
      city: 'İstanbul',
      is_active: true,
      company_id: 'd0c63e2a-5e4d-4e9a-be7d-1f9b3c8d9e8a'
    },
    {
      code: 'BOTH001',
      name: 'Veli Ticaret',
      type: 'both',
      phone: '0212 222 3344',
      email: 'veli@ticaret.com',
      city: 'Ankara',
      is_active: true,
      company_id: 'd0c63e2a-5e4d-4e9a-be7d-1f9b3c8d9e8a'
    }
  ];

  console.log('Test müşterileri ekleniyor...');
  
  for (const customer of testCustomers) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(customer)
      });
      
      if (response.ok) {
        console.log(`✅ ${customer.name} eklendi`);
      } else {
        console.error(`❌ ${customer.name} eklenemedi:`, await response.text());
      }
    } catch (error) {
      console.error(`❌ ${customer.name} hata:`, error);
    }
  }
  
  console.log('İşlem tamamlandı! Sayfayı yenileyin.');
}

// Fonksiyonu çalıştır
addTestCustomers();