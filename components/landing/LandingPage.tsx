'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from 'next/navigation';

// --- Marka Renkleri ---
//  Primary: Katip Lacivert  #0B1B36
//  Accent:  Katip Mavi      #2F7DF4
//  Ink:     Gri Metin       #475569
//  Sand:    Arkaplan        #F8FAFC
//  Mint:    Vurgu           #2AD3B9
//  Amber:   Uyarı / CTA     #F59E0B

function LandingPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white text-slate-800">
      {/* Şeritler / Grid Arkaplan */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <svg className="absolute left-1/2 top-[-10%] -translate-x-1/2" width="1600" height="800" viewBox="0 0 1600 800" fill="none">
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2F7DF4" stopOpacity="0.12"/>
              <stop offset="100%" stopColor="#2AD3B9" stopOpacity="0.04"/>
            </linearGradient>
          </defs>
          <ellipse cx="800" cy="120" rx="720" ry="140" fill="url(#g1)"/>
          <ellipse cx="800" cy="700" rx="900" ry="200" fill="url(#g1)"/>
        </svg>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#0B1B36] via-[#1E3A8A] to-[#2F7DF4] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-2xl md:text-3xl tracking-tight text-white">Kâtip</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#ozellikler" className="text-white/80 hover:text-white">Özellikler</a>
            <a href="#entegrasyonlar" className="text-white/80 hover:text-white">Entegrasyonlar</a>
            <a href="#fiyat" className="text-white/80 hover:text-white">Fiyat</a>
            <a href="#sss" className="text-white/80 hover:text-white">SSS</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/login')} className="hidden sm:inline-flex px-4 py-2 text-white/80 hover:text-white cursor-pointer">Giriş Yap</button>
            <button className="px-6 py-2 bg-white text-[#0B1B36] hover:bg-white/90 rounded-lg font-medium">Ücretsiz Dene</button>
          </div>
        </div>
      </header>

      {/* Üst Alan - Güven Mesajı */}
      <section className="bg-gradient-to-r from-[#F8FAFC] to-white py-4 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-slate-700">GİB Onaylı e-Fatura Entegrasyonu</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-slate-700">15 Dakikada Kurulum</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-slate-700">5.000+ İşletme Kullanıyor</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="relative py-12 sm:py-16" id="hero">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.h1 initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{duration:.5}} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1B36]">
              Stok & Cari yönetimi <span className="text-[#2F7DF4]">kolay</span> ve <span className="text-[#2AD3B9]">hızlı</span> olsun.
            </motion.h1>
            <p className="mt-5 text-lg text-slate-600 max-w-xl">
              Kâtip; tekliften faturaya, stoktan çek–senet ve tahsilata kadar tek panelde. Küçük ve orta ölçekli işletmeler için ışık hızında kurulum, sade ekranlar, tertemiz PDF'ler.
            </p>
            <form className="mt-6 flex gap-3 max-w-xl" onSubmit={(e)=>e.preventDefault()}>
              <input 
                type="email" 
                placeholder="E-posta adresiniz" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)} 
                className="flex-1 h-11 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2F7DF4] focus:border-transparent"
              />
              <button className="h-11 px-6 bg-[#2F7DF4] hover:bg-[#2269d1] text-white rounded-lg font-medium">Demosu gelsin</button>
            </form>
            <div className="mt-5 flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                KVKK uyumlu
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Gerçek zamanlı raporlar
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobil uyumlu
              </div>
            </div>
          </div>

          {/* Intro görseli — gülen Türk esnaf */}
          <motion.div initial={{opacity:0, scale:.98}} animate={{opacity:1, scale:1}} transition={{duration:.6}} className="relative">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-200">
              <img
                src="https://images.unsplash.com/photo-1556157382-97eda2d62296?w=800&h=600&q=80&fit=crop"
                alt="Kâtip kullanan mutlu işletme sahibi"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 border">
              <div className="h-10 w-10 rounded-full bg-[#2AD3B9]/15 grid place-items-center">
                <svg className="h-5 w-5 text-[#0B1B36]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="text-sm">
                <div className="font-semibold text-[#0B1B36]">5.000+ kullanıcı</div>
                <div className="text-slate-500">Memnuniyet oranı %97</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Güven Rozetleri */}
      <section className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-6 opacity-80">
          {[
            "e-Fatura",
            "e-Arşiv",
            "KVKK",
            "3D Secure",
            "Bankalar",
            "POS Entegrasyon"
          ].map((t, i) => (
            <div key={i} className="text-xs sm:text-sm px-3 py-1 rounded-full border bg-white/70">{t}</div>
          ))}
        </div>
      </section>

      {/* Özellikler */}
      <section id="ozellikler" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0B1B36]">İşin omurgası tek ekranda</h2>
            <p className="mt-3 text-slate-600">Stok, cari, teklif, sipariş, irsaliye, fatura, çek–senet, kasa–banka… Hepsi basit ve hızlı.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "database", title: "Stok & Depo", desc: "Lot/seri, çok depo, minimum seviye uyarıları, barkod ve hızlı sayım." },
              { icon: "users", title: "Cari & Risk", desc: "Vadesi gelen alacaklar, risk limiti, otomatik hatırlatma ve tahsilat akışı." },
              { icon: "file-text", title: "Teklif → Fatura", desc: "Tek tıkla tekliften siparişe, irsaliyeye ve faturaya dönüşüm." },
              { icon: "credit-card", title: "Ödeme & POS", desc: "Sanal POS/iyzico, mail–link ile tahsilat, taksit ve iade yönetimi." },
              { icon: "line-chart", title: "Raporlama", desc: "Kâr/Zarar, stok devir hızı, müşteri kârlılığı, kanban metrikleri." },
              { icon: "piggy-bank", title: "Çek–Senet", desc: "Tüm hareketler, bordrolama, tahsil/tediye ve teminat süreçleri." }
            ].map((feature, idx) => (
              <div key={idx} className="rounded-3xl border bg-white p-6 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-[#2F7DF4]/10 grid place-items-center text-[#0B1B36]">
                  <span className="text-lg">📦</span>
                </div>
                <div className="mt-3 font-semibold text-[#0B1B36]">{feature.title}</div>
                <p className="mt-1 text-slate-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Canlı Önizleme Kartları */}
      <section className="py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-6">
          {[
            {title:"Teklif PDF Önizleme", img:"https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop"},
            {title:"Stok Listesi", img:"https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?q=80&w=800&auto=format&fit=crop"},
            {title:"Cari Ekstresi", img:"https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop"},
          ].map((c, i)=> (
            <div key={i} className="rounded-3xl border bg-white overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[#0B1B36]">{c.title}</h3>
              </div>
              <div className="px-6 pb-6">
                <img src={c.img} alt={c.title} className="rounded-2xl border object-cover h-56 w-full"/>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Entegrasyonlar */}
      <section id="entegrasyonlar" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-3xl font-bold text-[#0B1B36]">Bağlan, çalıştır, akışı izle.</h3>
              <p className="mt-3 text-slate-600">E‑Fatura/e‑Arşiv, bankalar, e‑posta, Google Drive, muhasebe yazılımları ve daha fazlası. Katip, arayüzü boğmadan güçlü entegrasyonları sade kullanır.</p>
              <ul className="mt-6 space-y-3 text-slate-700">
                {[
                  "Gelir İdaresi – UBL‑TR e‑Fatura/e‑Arşiv",
                  "İyzico / Sanal POS – ödeme linki, taksit, iade",
                  "Gmail/Outlook – teklif ve irsaliye gönderimleri",
                  "Google Drive – yedekler, PDF arşivleri",
                  "Webhook – mobil ve 3. parti entegrasyonlar"
                ].map((li, i)=> (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-[#2AD3B9] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {li}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-3">
                <button className="px-6 py-2.5 bg-[#2F7DF4] hover:bg-[#2269d1] text-white rounded-lg font-medium">API Dokümanı</button>
                <button className="px-6 py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-medium flex items-center gap-2">
                  Teknik Mimarî
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {t:"UBL‑TR XML", icon:"📄"},
                  {t:"Banka Entegr.", icon:"💳"},
                  {t:"Drive Arşiv", icon:"🔒"},
                  {t:"Webhook", icon:"📊"},
                ].map((b, i)=> (
                  <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#2AD3B9]/10 grid place-items-center text-[#0B1B36]">
                      <span className="text-lg">{b.icon}</span>
                    </div>
                    <div className="font-medium text-[#0B1B36]">{b.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fiyatlandırma */}
      <section id="fiyat" className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-bold text-[#0B1B36]">Basit fiyat, net fayda</h3>
            <p className="mt-3 text-slate-600">Yıllık sözleşmesiz. İstediğin zaman yükselt. 14 gün ücretsiz dene.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                tier: "Başlangıç",
                price: "₺450/ay",
                subtitle: "En uygun plan",
                features: [
                  "1 şirket, 2 kullanıcı",
                  "Stok & Cari & Teklif",
                  "PDF şablonları",
                  "Temel raporlar",
                ],
                cta: "Ücretsiz Başla",
                highlight: false
              },
              {
                tier: "Profesyonel",
                price: "₺650/ay",
                subtitle: "En çok tercih edilen",
                features: [
                  "Sınırsız belge",
                  "Çok depo, çek–senet",
                  "Banka & POS entegrasyonları",
                  "Gelişmiş raporlar & uyarılar",
                ],
                cta: "14 Gün Dene",
                highlight: true
              },
              {
                tier: "Kurumsal",
                price: "Teklif",
                subtitle: "Özel ihtiyaçlar",
                features: [
                  "SLA & öncelikli destek",
                  "Özel entegrasyonlar",
                  "SSO & IP kısıtlama",
                  "Veri taşıma ve eğitim",
                ],
                cta: "Satış ile Görüş",
                highlight: false
              }
            ].map((plan, idx) => (
              <div key={idx} className={`rounded-3xl border bg-white p-6 ${plan.highlight ? "ring-2 ring-[#2F7DF4]" : ""}`}>
                <div className="flex items-baseline justify-between mb-4">
                  <h4 className="text-xl font-semibold text-[#0B1B36]">{plan.tier}</h4>
                  {plan.subtitle && (
                    <span className={`text-xs px-2 py-1 rounded-full ${plan.highlight?"bg-[#2F7DF4] text-white":"bg-slate-100 text-slate-600"}`}>
                      {plan.subtitle}
                    </span>
                  )}
                </div>
                <div className="text-3xl font-extrabold text-[#0B1B36] mb-6">{plan.price}</div>
                <ul className="space-y-3 text-sm mb-6">
                  {plan.features.map((f, i)=> (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="h-5 w-5 text-[#2AD3B9] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-2.5 rounded-lg font-medium ${plan.highlight?"bg-[#0B1B36] hover:bg-[#0a1831] text-white":"bg-[#2F7DF4] hover:bg-[#2269d1] text-white"}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-[#0B1B36] text-center mb-8">Sık Sorulan Sorular</h3>
          
          <div className="space-y-4">
            {[
              {
                q: "Verilerim nerede saklanıyor?",
                a: "Veriler Türkiye/EU bölgesinde barındırılan güvenli sunucularda saklanır. Günlük yedekleme ve versiyonlama yapılır."
              },
              {
                q: "E‑Fatura ve e‑Arşiv desteği var mı?",
                a: "UBL‑TR standardı desteklenir. Mevcut özel entegratörünüzle veya önerdiğimiz sağlayıcılarla çalışabiliriz."
              },
              {
                q: "Taşıma ve eğitim sağlıyor musunuz?",
                a: "Evet. Excel/CSV'den toplu aktarım, canlı eğitim oturumları ve dokümantasyon ile hızlı geçiş sağlanır."
              }
            ].map((item, idx) => (
              <div key={idx} className="border rounded-2xl p-6 bg-white">
                <h4 className="font-semibold text-[#0B1B36] mb-2">{item.q}</h4>
                <p className="text-slate-600 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#0B1B36] via-[#1E3A8A] to-[#2F7DF4] p-10 text-white grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <h4 className="text-2xl font-bold">Bugün kur, yarın kullan.</h4>
              <p className="mt-1 text-white/80">Kurulum 15 dakikadan kısa. İlk teklifini dakikalar içinde gönder.</p>
            </div>
            <div className="flex md:justify-end">
              <button className="px-8 py-3 bg-white text-[#0B1B36] hover:bg-white/90 rounded-lg font-semibold">Hemen Başla</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0B1B36]">Kâtip</span>
            </div>
            <p className="mt-3 text-slate-600">Stok & cari yönetimi için yalın, hızlı ve güçlü işletme yazılımı.</p>
          </div>
          <div>
            <div className="font-semibold text-[#0B1B36] mb-2">Ürün</div>
            <ul className="space-y-2 text-slate-600">
              <li>Özellikler</li>
              <li>Fiyatlandırma</li>
              <li>Güncellemeler</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[#0B1B36] mb-2">Kaynaklar</div>
            <ul className="space-y-2 text-slate-600">
              <li>API</li>
              <li>Yardım Merkezi</li>
              <li>KVKK & Güvenlik</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[#0B1B36] mb-2">İletişim</div>
            <ul className="space-y-2 text-slate-600">
              <li>info@katip.app</li>
              <li>+90 (312) 000 00 00</li>
              <li>Ankara, Türkiye</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} Katip Yazılım</div>
      </footer>
    </div>
  );
}

export default LandingPage;