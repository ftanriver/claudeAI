// Şablonların ortak davranışı: ?kart=<dosya> ile kartı seçer, [data-alan] metinlerini ve
// [data-ikon] ikonlarını (boşsa kartın türü) doldurur; &buton=0 ise CTA butonunu kaldırır.

// Lucide ikonları (ISC lisansı): "car", "house" ve "shield-check"
const IKONLAR = {
  tasit: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  konut: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  kalkan: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
};

const params = new URLSearchParams(location.search);
const kart = KARTLAR.find(k => k.dosya === params.get("kart")) || KARTLAR[0];

for (const el of document.querySelectorAll("[data-alan]")) {
  el.textContent = kart[el.dataset.alan];
}
for (const el of document.querySelectorAll("[data-ikon]")) {
  el.outerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IKONLAR[el.dataset.ikon || kart.tur]}</svg>`;
}
if (!kart.buton || params.get("buton") === "0") {
  document.querySelector(".cta")?.remove();
}
