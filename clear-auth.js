// Cookie temizleme scripti - tarayıcı konsolunda çalıştırın

// 1. Tüm Supabase cookie'lerini temizle
function clearSupabaseCookies() {
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // LocalStorage'ı da temizle
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });
  
  // SessionStorage'ı da temizle
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('✅ Tüm auth verileri temizlendi!');
}

clearSupabaseCookies();