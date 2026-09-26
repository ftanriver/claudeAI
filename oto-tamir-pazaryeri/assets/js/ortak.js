// Tüm sayfaların ortak katmanı: biçimlendirme, ikonlar, prototip durumu (tarayıcıda localStorage),
// talep akışının durum geçişleri ve modal / SMS / bildirim bileşenleri.
(function () {
  const V = window.TP_VERI;
  const TP = (window.TP = {});

  TP.$ = (s, kok = document) => kok.querySelector(s);
  TP.$$ = (s, kok = document) => Array.from(kok.querySelectorAll(s));
  TP.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---------- Biçimlendirme ----------
  const sayiBicim = new Intl.NumberFormat("tr-TR");
  TP.sayi = (n) => sayiBicim.format(n);
  TP.tl = (n) => sayiBicim.format(Math.round(n)) + " ₺";
  TP.puan = (p) => Number(p).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  TP.km = (k) => Number(k).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " km";
  TP.tarih = (t, secenek = { day: "numeric", month: "long" }) => new Intl.DateTimeFormat("tr-TR", secenek).format(new Date(t));
  TP.saat = (t) => new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(t));
  TP.tarihSaat = (t) => TP.tarih(t, { day: "numeric", month: "long", weekday: "long" }) + ", " + TP.saat(t);
  TP.sure = (ms) => {
    const dk = Math.floor(Math.max(0, ms) / 60000), sa = Math.floor(dk / 60), gun = Math.floor(sa / 24);
    if (gun >= 2) return `${gun} gün ${sa % 24} sa`;
    if (sa >= 1) return `${sa} sa ${dk % 60} dk`;
    return `${dk} dk`;
  };
  TP.once = (t) => {
    const dk = Math.round((Date.now() - t) / 60000);
    if (dk < 1) return "az önce";
    if (dk < 60) return `${dk} dk önce`;
    const sa = Math.round(dk / 60);
    return sa < 24 ? `${sa} sa önce` : `${Math.round(sa / 24)} gün önce`;
  };
  const rakamlar = (t) => String(t || "").replace(/\D/g, "").slice(-10);
  TP.telBicim = (t) => { const d = rakamlar(t); return `0 (${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`; };
  TP.telMaske = (t) => { const d = rakamlar(t); return `+90 ${d.slice(0, 3)} ••• •• ${d.slice(8, 10)}`; };
  TP.aracAdi = (a) => `${a.marka} ${a.model}`;
  TP.aracDetay = (a) => [a.yil, a.paket && a.paket !== V.PAKET_BILMIYORUM ? a.paket : "Paket belirtilmedi"].join(" · ");

  TP.KOMISYON = 0.1;
  TP.OTOMATIK_ONAY_SAAT = 72;
  TP.TEKLIF_SURESI_SAAT = 24;
  TP.PARCA = { orijinal: "Orijinal parça", muadil: "Muadil parça", cikma: "Çıkma parça", yok: "Parça gerekmiyor" };

  // ---------- İkonlar, logo, küçük bileşenler ----------
  TP.ikon = (ad, sinif = "") => `<svg class="ikon ${sinif}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${(window.TP_IKONLAR || {})[ad] || ""}</svg>`;
  TP.logo = () => `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><defs><linearGradient id="tp-logo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2FBBCF"/><stop offset="1" stop-color="#077F96"/></linearGradient></defs><path fill="url(#tp-logo-g)" d="M12 2h16a10 10 0 0 1 10 10v10a10 10 0 0 1-10 10H18.5l-7.3 5.7a1 1 0 0 1-1.6-.8v-5.4A10 10 0 0 1 2 22V12A10 10 0 0 1 12 2z"/><path transform="translate(8.6 5.6) scale(.95)" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/></svg>`;
  TP.ikonlariYerlestir = (kok = document) => {
    for (const el of TP.$$("i[data-ikon]", kok)) el.outerHTML = TP.ikon(el.dataset.ikon, el.className);
    for (const el of TP.$$("i[data-logo]", kok)) el.outerHTML = TP.logo();
  };
  TP.plaka = (id, boyut = "") => `<span class="plaka ${boyut}"><span class="plaka-tr" aria-hidden="true">TR</span><span class="plaka-no"><span class="gizli-metin">Talep numarası </span>${TP.esc(String(id).replace("-", " "))}</span></span>`;
  TP.yildiz = (p) => `<span class="stars" style="--p:${Number(p)}" aria-hidden="true"></span>`;
  TP.puanRozet = (p, n) => `<span class="rating" role="img" aria-label="5 üzerinden ${TP.puan(p)} puan${n != null ? `, ${TP.sayi(n)} değerlendirme` : ""}">${TP.yildiz(p)}<b>${TP.puan(p)}</b>${n != null ? `<span>(${TP.sayi(n)})</span>` : ""}</span>`;
  TP.dukkanLogo = (d, boyut = "") => `<span class="shop-logo ${boyut}" data-ton="${d.ton || 0}" aria-hidden="true">${TP.esc(d.kisa)}</span>`;
  TP.katEtiketleri = (ids, kapsam) => `<span class="cat-list">${ids.map((id) => {
    const k = V.kategori(id);
    const eksik = kapsam && !kapsam.includes(id);
    return `<span class="cat-tag${eksik ? " eksik" : ""}"${eksik ? ` title="${k.ad} bu teklifin kapsamında değil"` : ""}>${TP.ikon(k.ikon)}${k.ad}</span>`;
  }).join("")}</span>`;

  // Dükkan profil içeriği (landing'deki firma kartı ve teklif detayı ortak kullanır)
  TP.kriterCubuklari = (k) => `<div class="kriterler">${[["iscilik", "İşçilik"], ["fiyat", "Fiyat / performans"], ["zaman", "Zamanında teslim"], ["iletisim", "İletişim"]].map(([a, ad]) => `
    <div class="kriter"><span>${ad}</span><span class="kriter-bar"><span style="width:${(k[a] / 5) * 100}%"></span></span><b class="tnum">${TP.puan(k[a])}</b></div>`).join("")}</div>`;
  TP.yorumlarHTML = (adet = 3, baslangic = 0) => V.yorumlar.slice(baslangic, baslangic + adet).map((y) => `
    <article class="yorum">
      <header><b>${TP.esc(y.ad)}</b>${TP.yildiz(y.puan)}<span class="soluk">${y.gunOnce} gün önce</span></header>
      <p>${TP.esc(y.metin)}</p>
      <footer><span class="badge badge-success">${TP.ikon("badge-check")}Doğrulanmış iş</span><span class="soluk">${TP.esc(y.arac)}</span></footer>
    </article>`).join("");

  // ---------- Prototip durumu ----------
  // Girilen her şey yalnızca bu tarayıcıda tutulur; depolama kapalıysa sayfa bellekten çalışır.
  const ANAHTAR = "tamirport-prototip-v1";
  let bellek = null;
  const bos = () => ({ talepler: [], aktifTalepId: null, oturumTel: null, dukkan: {} });
  TP.durumOku = () => {
    try {
      const s = localStorage.getItem(ANAHTAR);
      if (s) return { ...bos(), ...JSON.parse(s) };
    } catch (e) { /* depolama kapalı */ }
    return bellek ? JSON.parse(JSON.stringify(bellek)) : bos();
  };
  TP.durumYaz = (d) => {
    bellek = d;
    try {
      localStorage.setItem(ANAHTAR, JSON.stringify(d));
    } catch (e) {
      try { // kota dolduysa fotoğrafsız kaydet
        localStorage.setItem(ANAHTAR, JSON.stringify({ ...d, talepler: d.talepler.map((t) => ({ ...t, fotolar: [] })) }));
      } catch (e2) { /* yalnızca bellekte kalır */ }
    }
  };
  TP.sifirla = () => {
    bellek = null;
    try { localStorage.removeItem(ANAHTAR); } catch (e) { /* yok say */ }
  };
  TP.talepler = () => TP.durumOku().talepler;
  TP.talepGetir = (id) => TP.talepler().find((t) => t.id === id) || null;
  TP.aktifTalep = () => {
    const d = TP.durumOku();
    return d.talepler.find((t) => t.id === d.aktifTalepId) || d.talepler[d.talepler.length - 1] || null;
  };
  TP.talepKaydet = (talep, aktifYap = false) => {
    const d = TP.durumOku();
    const i = d.talepler.findIndex((t) => t.id === talep.id);
    if (i >= 0) d.talepler[i] = talep; else d.talepler.push(talep);
    if (aktifYap || !d.aktifTalepId) d.aktifTalepId = talep.id;
    TP.durumYaz(d);
  };
  TP.oturumAc = (tel) => { const d = TP.durumOku(); d.oturumTel = rakamlar(tel); TP.durumYaz(d); };
  TP.dukkanDurumu = () => TP.durumOku().dukkan || {};
  TP.dukkanDurumuYaz = (parca) => { const d = TP.durumOku(); d.dukkan = { ...(d.dukkan || {}), ...parca }; TP.durumYaz(d); };
  TP.yeniTalepNo = () => "TP-" + (4830 + Math.floor(Math.random() * 5000));

  // Başka sekmede (ör. dükkan paneli) durum değişince sayfayı yeniden çizmek için
  TP.degisinceDinle = (fn) => addEventListener("storage", (e) => { if (e.key === ANAHTAR) fn(); });

  // ---------- Talep akışı ----------
  TP.ASAMALAR = [
    { id: "alindi", ad: "Talep alındı" },
    { id: "teklif", ad: "Teklifler" },
    { id: "secildi", ad: "Dükkan seçildi" },
    { id: "dukkanda", ad: "Araç dükkanda" },
    { id: "onarimda", ad: "Onarımda" },
    { id: "onay", ad: "Karşılıklı onay" },
    { id: "tamamlandi", ad: "Tamamlandı" },
  ];
  const SIRA = ["teklif", "secildi", "dukkanda", "onarimda", "onay", "tamamlandi"];
  TP.asamaSirasi = (asama) => (asama === "itiraz" ? SIRA.indexOf("onay") : SIRA.indexOf(asama));
  TP.ASAMA_ETIKET = {
    teklif: ["Teklifler geliyor", "badge-tq"], secildi: ["Dükkan seçildi", "badge-tq"], dukkanda: ["Araç dükkanda", "badge-warn"],
    onarimda: ["Onarımda · ödeme güvende", "badge-tq"], onay: ["Onayın bekleniyor", "badge-warn"], itiraz: ["Sorun bildirildi", "badge-danger"],
    tamamlandi: ["Tamamlandı", "badge-success"], iptal: ["Kapandı", "badge-outline"],
  };
  TP.asamaRozet = (asama) => { const [ad, s] = TP.ASAMA_ETIKET[asama] || ["-", "badge-outline"]; return `<span class="badge badge-dot ${s}">${ad}</span>`; };

  TP.secilenTeklif = (t) => (t && t.teklifler.find((q) => q.id === t.secilenTeklifId)) || null;
  TP.odenecekTutar = (t) => (t.kesinFiyat ? t.kesinFiyat.tutar : (TP.secilenTeklif(t) || {}).tutar || 0);
  TP.gorunurTeklifler = (t) => {
    const gecenSn = (Date.now() - t.olusturma) / 1000;
    return t.teklifler.filter((q) => q.durum !== "geri-cekildi" && (t.asama !== "teklif" || q.kaynak === "panel" || q.gelisSn <= gecenSn));
  };
  TP.teklifBitis = (t) => t.olusturma + TP.TEKLIF_SURESI_SAAT * 3600e3;

  const olay = (t, metin, kim) => { (t.olaylar = t.olaylar || []).push({ zaman: Date.now(), metin, kim }); };
  const kod4 = () => String(1000 + Math.floor(Math.random() * 9000));
  const SIFIRLANACAK = ["secilenTeklifId", "secimZamani", "randevu", "teslim", "kesinFiyat", "odeme", "ekIs", "ilerleme", "tamamlanma", "teslimAlma", "onayZamani", "itiraz", "degerlendirme", "iptalNedeni", "teslimKodu", "teslimAlmaKodu"];

  TP.akis = {
    teklifSec(t, teklifId) {
      const q = t.teklifler.find((x) => x.id === teklifId);
      t.secilenTeklifId = teklifId;
      t.secimZamani = Date.now();
      t.asama = "secildi";
      t.teslimKodu = kod4();
      t.teslimAlmaKodu = kod4();
      t.teklifler.forEach((x) => { if (x.durum !== "geri-cekildi") x.durum = x.id === teklifId ? "secildi" : "secilmedi"; });
      olay(t, `${q.dukkan.ad} seçildi. Adres ve telefon bilgileri karşılıklı açıldı.`, "musteri");
    },
    randevuKaydet(t, zaman) {
      t.randevu = zaman;
      olay(t, `Teslim randevusu: ${TP.tarihSaat(zaman)}`, "musteri");
    },
    aracTeslimAl(t, { km, yakit }) {
      t.asama = "dukkanda";
      t.teslim = { zaman: Date.now(), km, yakit };
      olay(t, `Araç dükkana teslim edildi. 4 yön fotoğraf, ${TP.sayi(km)} km ve yakıt (${yakit}) kaydedildi.`, "dukkan");
    },
    kesinFiyatGir(t, { tutar, gerekce }) {
      const q = TP.secilenTeklif(t);
      const revize = Number(tutar) !== q.tutar;
      t.kesinFiyat = { tutar: Number(tutar), revize, gerekce: gerekce || "", zaman: Date.now() };
      olay(t, revize ? `Dükkan kesin fiyatı revize etti: ${TP.tl(q.tutar)} → ${TP.tl(tutar)}` : `Dükkan ön teklifi onayladı: ${TP.tl(tutar)}`, "dukkan");
    },
    odemeYap(t, { taksit }) {
      t.asama = "onarimda";
      t.odeme = { durum: "guvende", tutar: t.kesinFiyat.tutar, ekTutar: 0, taksit, zaman: Date.now(), ref: "PAY-" + kod4() + kod4() };
      t.ilerleme = [{ zaman: Date.now(), metin: "Ödeme güvenceye alındı, onarım başladı." }];
      olay(t, `${TP.tl(t.odeme.tutar)} ödendi ve güvenceye alındı (${taksit > 1 ? taksit + " taksit" : "tek çekim"}).`, "musteri");
    },
    fiyatReddet(t) {
      t.asama = "iptal";
      t.iptalNedeni = "Kesin fiyatı onaylamadın. Aracın ücretsiz olarak iade edilecek; ödeme alınmadı.";
      olay(t, "Müşteri revize fiyatı reddetti. Araç ücretsiz iade edilecek.", "musteri");
    },
    ekIsTalep(t, { tutar, aciklama }) {
      t.ekIs = { tutar: Number(tutar), aciklama, durum: "bekliyor", zaman: Date.now() };
      olay(t, `Dükkan ek iş talep etti: ${aciklama} (${TP.tl(tutar)})`, "dukkan");
    },
    ekIsYanit(t, onay) {
      t.ekIs.durum = onay ? "onaylandi" : "reddedildi";
      if (onay) t.odeme.ekTutar = t.ekIs.tutar;
      olay(t, onay ? `Ek iş onaylandı, ${TP.tl(t.ekIs.tutar)} ek ödeme güvenceye alındı.` : "Ek iş reddedildi; onarım ilk kapsamla sürüyor.", "musteri");
    },
    ilerlemeEkle(t, metin) {
      (t.ilerleme = t.ilerleme || []).push({ zaman: Date.now(), metin });
    },
    onarimTamamla(t, { faturaNo }) {
      t.asama = "onay";
      t.tamamlanma = { zaman: Date.now(), faturaNo };
      olay(t, `Dükkan onarımı tamamladı, sonrası fotoğraflarını ve faturayı (${faturaNo}) yükledi.`, "dukkan");
    },
    aracTeslimEt(t) {
      t.teslimAlma = { zaman: Date.now() };
      olay(t, `Araç müşteriye teslim edildi. ${TP.OTOMATIK_ONAY_SAAT} saatlik onay süresi başladı.`, "dukkan");
    },
    musteriOnayla(t) {
      if (!t.teslimAlma) t.teslimAlma = { zaman: Date.now() };
      t.asama = "tamamlandi";
      t.onayZamani = Date.now();
      t.odeme.durum = "aktarildi";
      olay(t, "Müşteri onay verdi. Ödeme, komisyon düşülerek dükkana aktarıldı.", "musteri");
    },
    itirazAc(t, { neden, aciklama }) {
      t.asama = "itiraz";
      t.itiraz = { neden, aciklama, zaman: Date.now(), durum: "dukkan" };
      olay(t, `Müşteri sorun bildirdi: ${neden}. Ödeme bekletiliyor.`, "musteri");
    },
    itirazCoz(t, sonuc) {
      t.itiraz.durum = "cozuldu";
      t.itiraz.sonuc = sonuc;
      t.asama = "tamamlandi";
      t.onayZamani = Date.now();
      t.odeme.durum = "aktarildi";
      olay(t, `Uyuşmazlık çözüldü: ${sonuc}`, "platform");
    },
    degerlendir(t, deger) {
      t.degerlendirme = { ...deger, zaman: Date.now() };
      olay(t, `Müşteri ${deger.puan} yıldız verdi.`, "musteri");
    },
    iptal(t, neden) {
      t.asama = "iptal";
      t.iptalNedeni = neden;
      olay(t, neden, "musteri");
    },
    // Seçim ya da talep iptalinden sonra teklif listesine döner; geçmiş korunur
    teklifeDon(t, metin) {
      SIFIRLANACAK.forEach((k) => delete t[k]);
      t.asama = "teklif";
      t.teklifler.forEach((q) => { if (q.durum !== "geri-cekildi") q.durum = "beklemede"; });
      olay(t, metin, "musteri");
    },
    // Prototip kontrolleri: bir sonraki aşamaya varsayılan verilerle geçer
    ilerlet(t) {
      switch (t.asama) {
        case "teklif": {
          const q = TP.gorunurTeklifler(t)[0] || t.teklifler[0];
          TP.akis.teklifSec(t, q.id);
          const r = new Date(); r.setDate(r.getDate() + 1); r.setHours(10, 30, 0, 0);
          TP.akis.randevuKaydet(t, r.getTime());
          break;
        }
        case "secildi":
          TP.akis.aracTeslimAl(t, { km: 48250, yakit: "1/2" });
          break;
        case "dukkanda":
          if (!t.kesinFiyat) TP.akis.kesinFiyatGir(t, { tutar: TP.secilenTeklif(t).tutar });
          TP.akis.odemeYap(t, { taksit: 1 });
          TP.akis.ilerlemeEkle(t, "Hasarlı parça söküldü, ölçüm yapıldı.");
          break;
        case "onarimda":
          TP.akis.onarimTamamla(t, { faturaNo: "GIB2026" + kod4() + kod4() });
          break;
        case "onay":
        case "itiraz":
          if (!t.teslimAlma) TP.akis.aracTeslimEt(t);
          TP.akis.musteriOnayla(t);
          break;
        default:
      }
    },
    asamayaGetir(t, hedef) {
      const onceki = t.secilenTeklifId;
      SIFIRLANACAK.forEach((k) => delete t[k]);
      t.asama = "teklif";
      t.olaylar = (t.olaylar || []).slice(0, 1);
      t.teklifler.forEach((q) => { if (q.durum !== "geri-cekildi") q.durum = "beklemede"; });
      if (hedef === "teklif") return;
      const hedefSira = TP.asamaSirasi(hedef);
      let guvenlik = 0;
      while (TP.asamaSirasi(t.asama) < hedefSira && guvenlik++ < 8) {
        if (t.asama === "teklif" && onceki && t.teklifler.some((q) => q.id === onceki)) {
          TP.akis.teklifSec(t, onceki);
          const r = new Date(); r.setDate(r.getDate() + 1); r.setHours(10, 30, 0, 0);
          TP.akis.randevuKaydet(t, r.getTime());
        } else {
          TP.akis.ilerlet(t);
        }
      }
      if (hedef === "itiraz") {
        TP.akis.aracTeslimEt(t);
        TP.akis.itirazAc(t, { neden: "İşçilik kalitesi", aciklama: "Çamurluk ile kapı arasındaki boşluk eşit değil, boya tonunda fark var." });
      }
    },
  };

  // ---------- Bildirim, SMS, modal ----------
  TP.toast = (metin, { tur = "bilgi", ikon } = {}) => {
    let alan = TP.$(".toasts");
    if (!alan) {
      alan = document.createElement("div");
      alan.className = "toasts";
      alan.setAttribute("role", "status");
      alan.setAttribute("aria-live", "polite");
      document.body.append(alan);
    }
    const el = document.createElement("div");
    el.className = `toast ${tur}`;
    el.innerHTML = TP.ikon(ikon || { basari: "circle-check", uyari: "triangle-alert", bilgi: "info" }[tur]) + `<div>${metin}</div>`;
    alan.append(el);
    setTimeout(() => el.remove(), 4600);
  };

  // Telefona gelen SMS'in simülasyonu (gerçekte SMS sağlayıcısı gönderir)
  TP.sms = (metin, { eylemMetni, eylem } = {}) => {
    TP.$(".sms")?.remove();
    const el = document.createElement("div");
    el.className = "sms";
    el.setAttribute("role", "alert");
    el.innerHTML = `<span class="sms-app">${TP.ikon("message-square-text")}</span>
      <div class="sms-head"><b>Mesajlar · TamirPort</b><span>şimdi</span></div>
      <p class="sms-text">${metin}</p>
      <div class="sms-actions">${eylemMetni ? `<button type="button" class="btn btn-primary btn-sm" data-sms-eylem>${eylemMetni}</button>` : ""}<button type="button" class="btn btn-ghost btn-sm" data-sms-kapat>Kapat</button></div>`;
    document.body.append(el);
    const kapat = () => el.remove();
    el.querySelector("[data-sms-kapat]").addEventListener("click", kapat);
    el.querySelector("[data-sms-eylem]")?.addEventListener("click", () => { eylem && eylem(); kapat(); });
    setTimeout(kapat, 15000);
    return el;
  };
  TP.otpUret = () => String(100000 + Math.floor(Math.random() * 900000));

  // 6 kutulu kod girişi: otomatik ilerleme, yapıştırma ve geri silme
  TP.otpKur = (kap, { tamamlaninca } = {}) => {
    const kutular = TP.$$("input", kap);
    const deger = () => kutular.map((k) => k.value).join("");
    kutular.forEach((k, i) => {
      k.addEventListener("input", () => {
        const r = k.value.replace(/\D/g, "");
        if (r.length > 1) { dagit(r, i); return; }
        k.value = r;
        if (r && i < kutular.length - 1) kutular[i + 1].focus();
        kap.classList.remove("has-error");
        if (deger().length === kutular.length) tamamlaninca && tamamlaninca(deger());
      });
      k.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !k.value && i > 0) { kutular[i - 1].focus(); kutular[i - 1].value = ""; }
        if (e.key === "ArrowLeft" && i > 0) kutular[i - 1].focus();
        if (e.key === "ArrowRight" && i < kutular.length - 1) kutular[i + 1].focus();
      });
      k.addEventListener("paste", (e) => {
        const r = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (r) { e.preventDefault(); dagit(r, 0); }
      });
    });
    function dagit(r, bas) {
      r.split("").slice(0, kutular.length - bas).forEach((c, j) => { kutular[bas + j].value = c; });
      kutular[Math.min(bas + r.length, kutular.length - 1)].focus();
      if (deger().length === kutular.length) tamamlaninca && tamamlaninca(deger());
    }
    return {
      deger,
      doldur: (kod) => dagit(kod, 0),
      temizle: () => { kutular.forEach((k) => { k.value = ""; }); kutular[0].focus(); },
    };
  };

  TP.modalAc = (id) => {
    const d = typeof id === "string" ? document.getElementById(id) : id;
    if (!d) return null;
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
    return d;
  };
  TP.modalKapat = (id) => {
    const d = typeof id === "string" ? document.getElementById(id) : id;
    if (!d) return;
    if (typeof d.close === "function") d.close(); else d.removeAttribute("open");
  };

  // Tek seferlik modal: {baslik, alt, icerik (HTML), butonlar: [{metin, sinif, eylem}], genis}
  // eylem false dönerse modal açık kalır.
  TP.modal = ({ baslik, alt = "", icerik = "", butonlar = [], genis = false, kapaninca } = {}) => {
    const d = document.createElement("dialog");
    d.className = "modal" + (genis ? " wide" : "");
    d.setAttribute("aria-label", baslik.replace(/<[^>]+>/g, ""));
    d.innerHTML = `<div class="modal-head"><div><h2 class="modal-title">${baslik}</h2>${alt ? `<p class="modal-sub">${alt}</p>` : ""}</div>
      <button type="button" class="icon-btn" data-kapat aria-label="Kapat">${TP.ikon("x")}</button></div>
      <div class="modal-body">${icerik}</div>
      ${butonlar.length ? `<div class="modal-foot">${butonlar.map((b, i) => `<button type="button" class="btn ${b.sinif || "btn-secondary"}" data-buton="${i}">${b.metin}</button>`).join("")}</div>` : ""}`;
    document.body.append(d);
    butonlar.forEach((b, i) => d.querySelector(`[data-buton="${i}"]`).addEventListener("click", () => {
      const sonuc = b.eylem ? b.eylem(d) : undefined;
      if (sonuc !== false) d.close();
    }));
    d.addEventListener("close", () => { kapaninca && kapaninca(); d.remove(); });
    TP.modalAc(d);
    return d;
  };

  // Fotoğrafı küçültüp JPEG'e çevirir; tuvale çizmek EXIF/konum verisini de temizler
  TP.fotoKucult = (dosya, enBuyuk = 720) => new Promise((coz, reddet) => {
    const r = new FileReader();
    r.onerror = reddet;
    r.onload = () => {
      const img = new Image();
      img.onerror = reddet;
      img.onload = () => {
        const olcek = Math.min(1, enBuyuk / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * olcek);
        c.height = Math.round(img.height * olcek);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        coz(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = r.result;
    };
    r.readAsDataURL(dosya);
  });

  TP.kopyala = async (metin, mesaj = "Kopyalandı") => {
    try {
      await navigator.clipboard.writeText(metin);
      TP.toast(mesaj, { tur: "basari" });
    } catch (e) {
      TP.toast(`Kopyalanamadı. Metni seçip kopyalayabilirsin: <b>${TP.esc(metin)}</b>`, { tur: "uyari" });
    }
  };

  // Sağ altta açılan "Prototip kontrolleri" paneli
  TP.demoPanel = (cizici) => {
    let kap = TP.$(".demo");
    if (!kap) {
      kap = document.createElement("div");
      kap.className = "demo";
      kap.innerHTML = `<div class="demo-panel" id="demo-panel" hidden></div>
        <button type="button" class="demo-toggle" aria-expanded="false" aria-controls="demo-panel">${TP.ikon("sliders-horizontal")}Prototip kontrolleri</button>`;
      document.body.append(kap);
      const btn = kap.querySelector(".demo-toggle"), panel = kap.querySelector(".demo-panel");
      btn.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        btn.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) cizici(panel);
      });
    }
    const panel = kap.querySelector(".demo-panel");
    return { yenile: () => { if (!panel.hidden) cizici(panel); }, kapat: () => { panel.hidden = true; kap.querySelector(".demo-toggle").setAttribute("aria-expanded", "false"); } };
  };

  // ---------- Sayfa iskeleti ----------
  const SAYFALAR = [
    ["anasayfa", "index.html", "Ana sayfa"],
    ["talep", "talep.html", "Teklif takip"],
    ["musteri", "musteri-paneli.html", "Müşteri paneli"],
    ["dukkan", "dukkan-paneli.html", "Dükkan paneli"],
    ["akis", "akis.html", "Akış ve kurallar"],
  ];
  TP.protoSeritCiz = () => {
    const yer = TP.$("#proto-serit");
    if (!yer) return;
    const aktif = yer.dataset.sayfa;
    const linkler = SAYFALAR.map(([id, href, ad]) => `<a href="${href}"${id === aktif ? ' aria-current="page"' : ""}>${ad}</a>`).join("");
    yer.outerHTML = `<div class="proto-bar" role="navigation" aria-label="Prototip ekranları"><div class="wrap">
      <span class="proto-tag">${TP.ikon("sparkles")}Prototip</span>
      <span class="proto-note">Firma, puan ve fiyatlar örnektir. Girdiğin bilgiler yalnızca bu tarayıcıda tutulur.</span>
      <nav class="proto-links">${linkler}</nav>
      <details class="proto-menu"><summary>Ekranlar ${TP.ikon("chevron-down")}</summary><nav class="proto-links">${linkler}</nav></details>
    </div></div>`;
  };

  TP.baslikKur = () => {
    const h = TP.$(".site-header");
    if (h) {
      const f = () => h.classList.toggle("scrolled", scrollY > 8);
      f();
      addEventListener("scroll", f, { passive: true });
    }
    const btn = TP.$(".menu-toggle"), menu = TP.$("#mobil-menu");
    if (btn && menu) {
      const ayarla = (acik) => {
        menu.hidden = !acik;
        btn.setAttribute("aria-expanded", String(acik));
        btn.innerHTML = TP.ikon(acik ? "x" : "menu");
      };
      btn.addEventListener("click", () => ayarla(menu.hidden));
      menu.addEventListener("click", (e) => { if (e.target.closest("a, button")) ayarla(false); });
    }
    document.addEventListener("click", (e) => {
      const m = TP.$(".proto-menu[open]");
      if (m && !m.contains(e.target)) m.open = false;
    });
  };

  // Modal kapatma: [data-kapat] düğmesi ve arka plana tıklama
  document.addEventListener("click", (e) => {
    const kapat = e.target.closest("[data-kapat]");
    if (kapat && kapat.closest("dialog")) { kapat.closest("dialog").close(); return; }
    if (e.target instanceof HTMLDialogElement && e.target.classList.contains("modal")) {
      const r = e.target.getBoundingClientRect();
      const icinde = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!icinde) e.target.close();
    }
  });

  TP.sayfaKur = (fn) => {
    const calis = () => {
      document.documentElement.lang = "tr";
      TP.protoSeritCiz();
      TP.ikonlariYerlestir();
      TP.baslikKur();
      fn && fn();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", calis);
    else calis();
  };
})();
