// Teklif takip sayfası: misafir kullanıcı talebini burada baştan sona yönetir.
// Teklifleri karşılaştırır, seçer, randevu alır, kesin fiyatı onaylayıp öder, onarımı onaylar ve puanlar.
(function () {
  const V = window.TP_VERI;
  const { $, esc } = TP;

  const SIRALAMALAR = [["onerilen", "Önerilen"], ["fiyat", "En uygun fiyat"], ["puan", "En yüksek puan"], ["mesafe", "En yakın"], ["sure", "En kısa süre"]];
  const TAKSITLER = [[1, 0], [2, 0.025], [3, 0.045], [6, 0.089], [9, 0.132]];
  const SAATLER = ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"];
  const DOLU_SAAT = "13:00"; // dükkan takviminde dolu örnek slot

  let talep = null;
  let siralama = "onerilen";
  let sadeceTam = false;
  const karsilastirma = new Set();
  const yeniGelenler = new Set();
  let gorunenIdler = new Set();
  let randevuGun = null, randevuSaat = null, randevuDuzenle = false;
  const puanlar = { genel: 0, iscilik: 0, fiyat: 0, zaman: 0, iletisim: 0 };
  let demo;

  const tamKapsar = (q) => talep.kategoriler.every((k) => q.kapsam.includes(k));
  const odenenToplam = () => (talep.odeme ? talep.odeme.tutar + (talep.odeme.ekTutar || 0) : TP.odenecekTutar(talep));
  const bantKapali = (ad) => { try { return sessionStorage.getItem("tp-bant-" + ad) === "1"; } catch (e) { return false; } };

  function yukle() {
    talep = TP.aktifTalep() || V.ornekTalep();
    gorunenIdler = new Set(TP.gorunurTeklifler(talep).map((q) => q.id));
  }
  function kaydet() { TP.talepKaydet(talep, true); }
  function guncelle(fn) {
    fn(talep);
    kaydet();
    ciz();
    if (demo) demo.yenile();
  }

  // ---------- Çizim ----------
  function ciz() {
    ustBantCiz();
    ozetCiz();
    stepperCiz();
    icerikCiz();
    yanCiz();
    karsilastirBarCiz();
    sayaclar();
  }

  function ustBantCiz() {
    const parcalar = [];
    if (talep.ornek) parcalar.push(`<div class="notice">${TP.ikon("info")}<span><b>Örnek talep gösteriliyor.</b> Kendi talebini görmek için <a href="index.html#teklif-al">ana sayfadaki formu</a> doldur; bu sayfa o talebinle açılır.</span></div>`);
    if (!bantKapali("misafir") && !TP.durumOku().uye) parcalar.push(`<div class="notice">${TP.ikon("smartphone")}<span>Üye olmadan takip ediyorsun. Bu sayfanın linki <b class="tnum">${TP.telMaske(talep.iletisim.tel)}</b> numarasına SMS ile gönderildi. Başka bir cihazdan <b>Tekliflerim</b> butonu ve telefon numaranla girebilirsin.</span><button type="button" class="icon-btn" data-bant-kapat="misafir" aria-label="Bilgiyi gizle">${TP.ikon("x")}</button></div>`);
    $("#ust-bant").innerHTML = parcalar.join("");
  }

  function ozetCiz() {
    $("#talep-ozet").innerHTML = `
      <div class="ozet-sol">
        <div class="ozet-ust">${TP.plaka(talep.id)}${TP.asamaRozet(talep.asama)}</div>
        <h1>${esc(TP.aracAdi(talep.arac))}</h1>
        <p class="ozet-meta"><span>${TP.ikon("car")}${esc(TP.aracDetay(talep.arac))}</span><span>${TP.ikon("map-pin")}${esc(talep.ilce)}, ${esc(talep.il)}</span><span>${TP.ikon("calendar")}${TP.tarih(talep.olusturma)}, ${TP.saat(talep.olusturma)}</span></p>
        ${TP.katEtiketleri(talep.kategoriler)}
      </div>
      <div class="ozet-sag">${ozetSag()}</div>`;
  }
  function ozetSag() {
    const q = TP.secilenTeklif(talep);
    switch (talep.asama) {
      case "teklif": {
        const n = TP.gorunurTeklifler(talep).length;
        const bitis = TP.teklifBitis(talep);
        return `<span class="etiket">Gelen teklif</span><span class="deger">${n}</span>
          <span class="alt">${bitis > Date.now() ? `Toplama süresi: <b data-geri-sayim="${bitis}"></b>` : "Teklif toplama tamamlandı"}</span>`;
      }
      case "secildi":
        return `<span class="etiket">Seçilen teklif</span><span class="deger">${TP.tl(q.tutar)}</span><span class="alt">${talep.randevu ? "Randevu: " + TP.tarihSaat(talep.randevu) : "Randevu saati bekleniyor"}</span>`;
      case "dukkanda":
        return `<span class="etiket">${talep.kesinFiyat ? "Kesin fiyat" : "Ön teklif"}</span><span class="deger">${TP.tl(TP.odenecekTutar(talep))}</span><span class="alt">${talep.kesinFiyat ? "Onayın bekleniyor" : "Dükkan aracı inceliyor"}</span>`;
      case "onarimda":
        return `<span class="etiket">Ödeme güvende</span><span class="deger">${TP.tl(odenenToplam())}</span><span class="alt">Onayına kadar dükkana geçmez</span>`;
      case "onay":
        return talep.teslimAlma
          ? `<span class="etiket">Otomatik onaya kalan</span><span class="deger" data-geri-sayim="${talep.teslimAlma.zaman + TP.OTOMATIK_ONAY_SAAT * 3600e3}"></span><span class="alt">Onay ya da sorun bildirimi bekleniyor</span>`
          : `<span class="etiket">Teslim alma kodu</span><span class="deger tnum">${talep.teslimAlmaKodu}</span><span class="alt">Aracı alırken dükkana söyle</span>`;
      case "itiraz":
        return `<span class="etiket">Ödeme bekletiliyor</span><span class="deger">${TP.tl(odenenToplam())}</span><span class="alt">Uyuşmazlık süreci</span>`;
      case "tamamlandi":
        return `<span class="etiket">Dükkana aktarıldı</span><span class="deger">${TP.tl(odenenToplam())}</span><span class="alt">${TP.tarih(talep.onayZamani)}</span>`;
      default:
        return `<span class="etiket">Durum</span><span class="deger">Kapandı</span>`;
    }
  }

  function stepperCiz() {
    const sira = { teklif: 1, secildi: 2, dukkanda: 3, onarimda: 4, onay: 5, itiraz: 5, tamamlandi: 6 }[talep.asama] ?? 0;
    const itiraz = talep.asama === "itiraz", iptal = talep.asama === "iptal";
    const adimlar = TP.ASAMALAR.map((a, i) => {
      let durum = iptal ? (i === 0 ? "tamam" : "") : i < sira || (talep.asama === "tamamlandi" && i === 6) ? "tamam" : i === sira ? "aktif" : "";
      if (itiraz && i === 5) durum = "sorun";
      return { ad: itiraz && i === 5 ? "Sorun bildirildi" : a.ad, durum };
    });
    const aktif = adimlar.findIndex((a) => a.durum === "aktif" || a.durum === "sorun");
    const aktifAd = iptal ? "Talep kapandı" : talep.asama === "tamamlandi" ? "Tamamlandı" : adimlar[aktif].ad;
    const sonraki = !iptal && aktif >= 0 && aktif < 6 ? adimlar[aktif + 1].ad : "";
    const yuzde = iptal ? 0 : talep.asama === "tamamlandi" ? 100 : Math.round((aktif / 6) * 100);
    $("#stepper").innerHTML = `
      <ol>${adimlar.map((a, i) => `<li class="${a.durum}"${a.durum === "aktif" || a.durum === "sorun" ? ' aria-current="step"' : ""}><span class="nokta">${a.durum === "tamam" ? TP.ikon("check") : i + 1}</span>${a.ad}</li>`).join("")}</ol>
      <div class="stepper-mobil">
        <div class="satir"><span>${iptal ? "" : `Adım <b>${talep.asama === "tamamlandi" ? 7 : aktif + 1}/7</b> · `}${aktifAd}</span>${sonraki ? `<span class="soluk">Sonraki: ${sonraki}</span>` : ""}</div>
        <div class="bar"><span style="width:${yuzde}%"></span></div>
      </div>`;
  }

  function icerikCiz() {
    const cizici = { teklif: teklifAsamasi, secildi: secildiAsamasi, dukkanda: dukkandaAsamasi, onarimda: onarimdaAsamasi, onay: onayAsamasi, itiraz: itirazAsamasi, tamamlandi: tamamlandiAsamasi }[talep.asama] || iptalAsamasi;
    $("#asama-icerik").innerHTML = cizici();
    yeniGelenler.clear();
  }

  // ---------- 1. Teklifler ----------
  function teklifAsamasi() {
    const tum = TP.gorunurTeklifler(talep);
    const bitis = TP.teklifBitis(talep);
    const acik = bitis > Date.now();
    const gecen = Math.min(100, Math.max(0, ((Date.now() - talep.olusturma) / (TP.TEKLIF_SURESI_SAAT * 3600e3)) * 100));
    const liste = sirala(sadeceTam ? tum.filter(tamKapsar) : tum.slice(), tum);
    const rozetler = rozetHesapla(tum);
    return `
      <section class="panel">
        <div class="panel-head">
          <div><h2>Teklifler</h2><p>Teklifler kapalı zarftır: dükkanlar birbirinin fiyatını görmez. Fiyat, puan ve garantiye bakarak birini seç.</p></div>
          <div class="sure-kutusu">
            <div class="satir"><span>${acik ? "Teklif toplama" : "Seçim süresi"}</span><b data-geri-sayim="${acik ? bitis : bitis + 72 * 3600e3}" data-sonek=" kaldı"></b></div>
            <div class="sure-bar"><span style="width:${acik ? gecen : 100}%"></span></div>
            <div class="satir"><span>${talep.iletilen || tum.length} dükkana iletildi</span><span>${tum.length} teklif</span></div>
          </div>
        </div>
        ${tum.length === 0 ? `
          <div class="teklif-bekleniyor"><span class="nabiz"></span>Talebin ${talep.iletilen} dükkana iletildi. İlk teklif geldiğinde burada görünecek ve sana SMS ile haber vereceğiz.</div>
          <div class="iskelet" aria-hidden="true"><div></div><div></div></div>` : `
          ${aralikHTML(tum)}
          <div class="liste-arac">
            <div class="seg" role="group" aria-label="Sıralama">${SIRALAMALAR.map(([k, ad]) => `<button type="button" aria-pressed="${k === siralama}" data-sirala="${k}">${ad}</button>`).join("")}</div>
            ${talep.kategoriler.length > 1 ? `<label class="switch"><input type="checkbox" id="sadece-tam" ${sadeceTam ? "checked" : ""}>Tüm işi kapsayanlar</label>` : ""}
          </div>
          ${siralama === "onerilen" ? `<p class="hint">${TP.ikon("info")} Önerilen sıralama fiyat, puan, teklife sadakat, mesafe ve süreyi birlikte değerlendirir; işin tamamını kapsayan teklifler önce gelir.</p>` : ""}
          <div class="teklif-listesi">${liste.map((q) => teklifKarti(q, rozetler)).join("") || `<p class="yan-bos">Bu filtreyle eşleşen teklif yok.</p>`}</div>`}
        ${acik && tum.length ? `<div class="teklif-bekleniyor"><span class="nabiz"></span>Teklif toplama süresi dolana kadar yeni teklifler gelebilir. İstersen şimdi seçim yapabilirsin.</div>` : ""}
      </section>`;
  }

  function oneriPuani(q, tum) {
    const f = tum.map((x) => x.tutar), fMin = Math.min(...f), fMax = Math.max(...f);
    const mMax = Math.max(...tum.map((x) => x.mesafeKm)) || 1;
    const sMax = Math.max(...tum.map((x) => x.sureGun));
    const fiyat = fMax > fMin ? (fMax - q.tutar) / (fMax - fMin) : 1;
    const puan = Math.max(0, q.dukkan.puan - 4);
    const sadakat = Math.max(0, (q.dukkan.sadakat - 85) / 15);
    const mesafe = 1 - q.mesafeKm / mMax;
    const sure = sMax > 1 ? 1 - (q.sureGun - 1) / (sMax - 1) : 1;
    return (tamKapsar(q) ? 10 : 0) + fiyat * 0.35 + puan * 0.3 + sadakat * 0.15 + mesafe * 0.1 + sure * 0.1;
  }
  function sirala(liste, tum) {
    const f = {
      fiyat: (a, b) => a.tutar - b.tutar,
      puan: (a, b) => b.dukkan.puan - a.dukkan.puan || b.dukkan.degerlendirme - a.dukkan.degerlendirme,
      mesafe: (a, b) => a.mesafeKm - b.mesafeKm,
      sure: (a, b) => a.sureGun - b.sureGun || a.tutar - b.tutar,
      onerilen: (a, b) => oneriPuani(b, tum) - oneriPuani(a, tum),
    }[siralama];
    return liste.sort(f);
  }
  function rozetHesapla(tum) {
    const r = {};
    const ekle = (q, html) => { (r[q.id] = r[q.id] || []).push(html); };
    if (tum.length >= 2) {
      const en = (fn) => tum.reduce((a, b) => (fn(b, a) ? b : a));
      ekle(en((b, a) => b.tutar < a.tutar), `<span class="badge badge-success">${TP.ikon("tag")}En uygun fiyat</span>`);
      ekle(en((b, a) => b.dukkan.puan > a.dukkan.puan || (b.dukkan.puan === a.dukkan.puan && b.dukkan.degerlendirme > a.dukkan.degerlendirme)), `<span class="badge badge-tq">${TP.ikon("star")}En yüksek puan</span>`);
      ekle(en((b, a) => b.mesafeKm < a.mesafeKm), `<span class="badge badge-outline">${TP.ikon("navigation")}En yakın</span>`);
      ekle(en((b, a) => b.sureGun < a.sureGun), `<span class="badge badge-outline">${TP.ikon("timer")}En kısa süre</span>`);
    }
    tum.forEach((q) => {
      if (!tamKapsar(q)) ekle(q, `<span class="badge badge-warn">${TP.ikon("circle-alert")}Kısmi teklif</span>`);
      if (q.guncellendi) ekle(q, `<span class="badge badge-outline">${TP.ikon("pencil")}Güncellendi</span>`);
    });
    return r;
  }
  function aralikHTML(tum) {
    const fiyatlar = tum.map((q) => q.tutar).sort((a, b) => a - b);
    const min = fiyatlar[0], max = fiyatlar[fiyatlar.length - 1], n = fiyatlar.length;
    const ortanca = n % 2 ? fiyatlar[(n - 1) / 2] : (fiyatlar[n / 2 - 1] + fiyatlar[n / 2]) / 2;
    const konum = (x) => (max === min ? 50 : 3 + ((x - min) / (max - min)) * 94);
    return `<div class="aralik">
      <div class="aralik-ust"><span>Teklif aralığı</span><b>${n > 1 ? `${TP.tl(min)} – ${TP.tl(max)}` : TP.tl(min)}</b>${n > 2 ? `<span>Ortanca ${TP.tl(ortanca)}</span>` : ""}</div>
      <div class="aralik-cizgi">${tum.map((q) => `<span class="aralik-nokta${q.tutar === min && n > 1 ? " en-ucuz" : ""}" style="left:${konum(q.tutar)}%" title="${esc(q.dukkan.ad)}: ${TP.tl(q.tutar)}"></span>`).join("")}${n > 2 ? `<span class="aralik-ortanca" style="left:${konum(ortanca)}%" title="Ortanca ${TP.tl(ortanca)}"></span>` : ""}</div>
      <div class="aralik-alt"><span>En düşük</span>${n > 2 ? "<span>Dikey çizgi: ortanca</span>" : ""}<span>En yüksek</span></div>
    </div>`;
  }
  function teklifKarti(q, rozetler) {
    const d = q.dukkan;
    const secili = karsilastirma.has(q.id);
    const dolu = karsilastirma.size >= 3 && !secili;
    return `<article class="teklif${secili ? " secili" : ""}${yeniGelenler.has(q.id) ? " yeni" : ""}" data-teklif="${q.id}">
      <div class="teklif-ust">
        ${TP.dukkanLogo(d)}
        <div class="teklif-dukkan">
          <h3>${esc(d.ad)}${d.anlasmali ? `<span title="Anlaşmalı firma">${TP.ikon("badge-check")}</span>` : ""}</h3>
          <p>${TP.puanRozet(d.puan, d.degerlendirme)}<span>${TP.ikon("map-pin")}${esc(d.ilce)} · ${TP.km(q.mesafeKm)}</span></p>
        </div>
        <div class="teklif-fiyat"><b>${TP.tl(q.tutar)}</b><span>KDV dahil</span></div>
      </div>
      <div class="teklif-rozetler">${(rozetler[q.id] || []).join("")}</div>
      <dl class="teklif-detay">
        <div><dt>${TP.ikon("clock")}Süre</dt><dd>${q.sureGun} iş günü</dd></div>
        <div><dt>${TP.ikon("package")}Parça</dt><dd>${TP.PARCA[q.parcaTuru]}</dd></div>
        <div><dt>${TP.ikon("shield")}Garanti</dt><dd>${q.garantiAy} ay işçilik</dd></div>
        <div><dt>${TP.ikon("handshake")}Teklife sadakat</dt><dd>%${d.sadakat}</dd></div>
      </dl>
      <div class="teklif-kapsam"><span>Kapsam:</span>${TP.katEtiketleri(talep.kategoriler, q.kapsam)}${q.cekici ? `<span class="badge badge-outline">${TP.ikon("truck")}Çekici ${q.cekici === "ucretsiz" ? "ücretsiz" : "ücretli"}</span>` : ""}</div>
      ${q.not ? `<p class="teklif-not">${esc(q.not)}</p>` : ""}
      <div class="teklif-alt">
        <label class="check"><input type="checkbox" data-karsilastir="${q.id}" ${secili ? "checked" : ""} ${dolu ? "disabled" : ""}>Karşılaştır</label>
        <button type="button" class="btn btn-ghost btn-sm" data-detay="${q.id}">Detaylar</button>
        <button type="button" class="btn btn-primary btn-sm" data-sec="${q.id}">Bu teklifi seç</button>
      </div>
    </article>`;
  }

  function detayAc(id) {
    const q = talep.teklifler.find((x) => x.id === id), d = q.dukkan;
    const gecerlilik = (q.zaman || talep.olusturma) + 7 * 864e5;
    TP.modal({
      baslik: esc(d.ad),
      alt: `${esc(d.ilce)}, ${esc(d.il)} · ${TP.km(q.mesafeKm)} · ${d.kurulus}'dan beri`,
      icerik: `
        <div class="kirilim">
          <div class="satir"><span>İşçilik</span><span>${TP.tl(q.iscilik)}</span></div>
          <div class="satir"><span>Parça · ${TP.PARCA[q.parcaTuru].toLocaleLowerCase("tr")}</span><span>${TP.tl(q.parca)}</span></div>
          <div class="satir toplam"><span>Toplam (KDV dahil)</span><span>${TP.tl(q.tutar)}</span></div>
        </div>
        <dl class="istatlar">
          <div class="istat"><dt>Süre</dt><dd>${q.sureGun} gün</dd></div>
          <div class="istat"><dt>Garanti</dt><dd>${q.garantiAy} ay</dd></div>
          <div class="istat"><dt>Puan</dt><dd>${TP.puan(d.puan)}</dd></div>
          <div class="istat"><dt>Sadakat</dt><dd>%${d.sadakat}</dd></div>
        </dl>
        ${q.not ? `<div><p class="alt-baslik">Dükkanın notu</p><p class="teklif-not">${esc(q.not)}</p></div>` : ""}
        <ul class="kural-listesi">
          <li>${TP.ikon("calendar-check")}<span>Teklif ${TP.tarih(gecerlilik)} tarihine kadar geçerli.</span></li>
          <li>${TP.ikon("scale")}<span>Kesin fiyat araç görüldükten sonra netleşir. Değişirse gerekçesiyle onayın istenir.</span></li>
          <li>${TP.ikon("wrench")}<span>Fiyatı onaylamazsan söküm-montaj bedeli: <b>${q.sokumBedeli ? `${TP.tl(q.sokumBedeli)}</b> (yalnızca söküme onay verdiysen)` : "0 ₺</b>"}</span></li>
          ${q.cekici ? `<li>${TP.ikon("truck")}<span>Çekici hizmeti ${q.cekici === "ucretsiz" ? "ücretsiz" : "ücretli, tutarı ayrıca bildirilir"}.</span></li>` : ""}
        </ul>
        <div><p class="alt-baslik">Değerlendirme kriterleri</p>${TP.kriterCubuklari(d.kriterler)}</div>
        <div><p class="alt-baslik">Son değerlendirmeler</p>${TP.yorumlarHTML(2, d.puan > 4.7 ? 0 : 2)}</div>
        <p class="notice">${TP.ikon("lock")}<span>Adres ve telefon, bu teklifi seçtiğinde açılır.</span></p>`,
      butonlar: talep.asama === "teklif"
        ? [{ metin: "Kapat" }, { metin: "Bu teklifi seç", sinif: "btn-primary", eylem: () => { setTimeout(() => secimOnay(id), 60); } }]
        : [{ metin: "Kapat" }],
    });
  }

  function secimOnay(id) {
    const q = talep.teklifler.find((x) => x.id === id), d = q.dukkan;
    const eksik = talep.kategoriler.filter((k) => !q.kapsam.includes(k)).map((k) => V.kategori(k).ad);
    TP.modal({
      baslik: "Bu teklifi seçiyor musun?",
      icerik: `
        <div class="secim-ozet">${TP.dukkanLogo(d)}<div><b>${esc(d.ad)}</b><div class="soluk">${TP.PARCA[q.parcaTuru]} · ${q.garantiAy} ay garanti · ${q.sureGun} iş günü</div></div><b class="tutar">${TP.tl(q.tutar)}</b></div>
        ${eksik.length ? `<p class="notice warn">${TP.ikon("triangle-alert")}<span>Bu teklif <b>${eksik.join(", ")}</b> işini kapsamıyor. O iş için ayrı talep açman gerekebilir.</span></p>` : ""}
        <p class="alt-baslik">Seçtiğinde ne olur?</p>
        <ul class="kural-listesi">
          <li>${TP.ikon("store")}<span>Dükkanın adresi, konumu ve telefonu sana açılır. Adın ve telefonun yalnızca bu dükkanla paylaşılır.</span></li>
          <li>${TP.ikon("circle-x")}<span>Diğer teklifler kapanır ve dükkanlara bildirilir.</span></li>
          <li>${TP.ikon("credit-card")}<span><b>Şimdi ödeme alınmaz.</b> Araç dükkanda incelenip kesin fiyat belli olduğunda ödersin.</span></li>
          <li>${TP.ikon("scale")}<span>Kesin fiyat farklı çıkarsa gerekçesiyle sana sorulur; onaylamazsan aracını ücretsiz geri alırsın.</span></li>
          <li>${TP.ikon("rotate-ccw")}<span>Aracı teslim etmeden önce seçimini ücretsiz iptal edebilirsin.</span></li>
        </ul>`,
      butonlar: [
        { metin: "Vazgeç" },
        {
          metin: "Seçimi onayla", sinif: "btn-primary", eylem: () => {
            karsilastirma.clear();
            guncelle((t) => TP.akis.teklifSec(t, id));
            window.scrollTo({ top: 0, behavior: "smooth" });
            TP.toast(`${esc(d.ad)} seçildi. İletişim bilgileri açıldı.`, { tur: "basari" });
            setTimeout(() => TP.sms(`${esc(d.ad)} ile eşleştin. Adres: ${esc(d.adres)}, ${esc(d.ilce)}. Tel: ${esc(d.tel)}. Teslim kodun takip sayfanda.`), 900);
          },
        },
      ],
    });
  }

  function karsilastirBarCiz() {
    const bar = $("#karsilastir-bar");
    const goster = talep.asama === "teklif" && karsilastirma.size > 0;
    bar.hidden = !goster;
    document.body.classList.toggle("bar-acik", goster);
    if (!goster) return;
    bar.innerHTML = `<p><b>${karsilastirma.size}</b> teklif seçildi${karsilastirma.size < 2 ? " · en az 2 seç" : ""}</p>
      <button type="button" class="btn btn-ghost btn-sm" data-karsilastir-temizle>Temizle</button>
      <button type="button" class="btn btn-primary btn-sm" data-karsilastir-ac ${karsilastirma.size < 2 ? "disabled" : ""}>${TP.ikon("columns-3")}Karşılaştır</button>`;
  }
  function karsilastirAc() {
    const qs = [...karsilastirma].map((id) => talep.teklifler.find((q) => q.id === id)).filter(Boolean);
    const enIyi = (deger, yon) => {
      const vals = qs.map(deger);
      const hedef = yon === "min" ? Math.min(...vals) : Math.max(...vals);
      return (q) => (new Set(vals).size > 1 && deger(q) === hedef ? ' class="en-iyi"' : "");
    };
    const bos = () => "";
    const satirlar = [
      ["Toplam fiyat", (q) => TP.tl(q.tutar), enIyi((q) => q.tutar, "min")],
      ["Puan", (q) => `${TP.puan(q.dukkan.puan)} (${q.dukkan.degerlendirme})`, enIyi((q) => q.dukkan.puan, "max")],
      ["Mesafe", (q) => TP.km(q.mesafeKm), enIyi((q) => q.mesafeKm, "min")],
      ["Süre", (q) => `${q.sureGun} iş günü`, enIyi((q) => q.sureGun, "min")],
      ["Parça", (q) => TP.PARCA[q.parcaTuru], bos],
      ["İşçilik garantisi", (q) => `${q.garantiAy} ay`, enIyi((q) => q.garantiAy, "max")],
      ["Teklife sadakat", (q) => `%${q.dukkan.sadakat}`, enIyi((q) => q.dukkan.sadakat, "max")],
      ["Kapsam", (q) => q.kapsam.map((k) => V.kategori(k).ad).join(", ") + (tamKapsar(q) ? "" : " (kısmi)"), bos],
      ["Çekici", (q) => (q.cekici ? (q.cekici === "ucretsiz" ? "Ücretsiz" : "Ücretli") : "Yok"), bos],
      ["Söküm-montaj bedeli", (q) => TP.tl(q.sokumBedeli), enIyi((q) => q.sokumBedeli, "min")],
    ];
    TP.modal({
      baslik: "Teklifleri karşılaştır", alt: "Her satırdaki en iyi değer yeşil gösterilir.", genis: true,
      icerik: `<div class="tablo-kap"><table class="karsilastirma">
        <thead><tr><th scope="col"><span class="gizli-metin">Özellik</span></th>${qs.map((q) => `<th scope="col">${TP.dukkanLogo(q.dukkan, "kucuk")}<div>${esc(q.dukkan.ad)}</div></th>`).join("")}</tr></thead>
        <tbody>${satirlar.map(([ad, f, sinif]) => `<tr><th scope="row">${ad}</th>${qs.map((q) => `<td${sinif(q)}>${f(q)}</td>`).join("")}</tr>`).join("")}
        <tr><th scope="row"><span class="gizli-metin">Seçim</span></th>${qs.map((q) => `<td><button type="button" class="btn btn-primary btn-sm" data-karsilastir-sec="${q.id}">Bunu seç</button></td>`).join("")}</tr></tbody>
      </table></div>`,
    });
  }

  // ---------- 2. Dükkan seçildi: iletişim, randevu, teslim kodu ----------
  function sonrakiGunler(adet) {
    const gunler = [];
    const g = new Date();
    while (gunler.length < adet) {
      g.setDate(g.getDate() + 1);
      if (g.getDay() === 0) continue; // pazar kapalı
      const anahtar = `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`;
      gunler.push({ anahtar, gunAd: TP.tarih(g, { weekday: "short" }), gun: g.getDate(), ay: TP.tarih(g, { month: "short" }) });
    }
    return gunler;
  }
  function randevuHTML() {
    if (talep.randevu && !randevuDuzenle) {
      return `<section class="panel"><h2>Teslim randevusu</h2>
        <div class="randevu-kayit">${TP.ikon("calendar-check")}<div><b>${TP.tarihSaat(talep.randevu)}</b><div>Randevudan sonraki 2 gün içinde teslim etmezsen seçim düşer.</div></div><button type="button" class="link-btn" data-randevu-degistir>Değiştir</button></div>
      </section>`;
    }
    return `<section class="panel">
      <div><h2>Teslim randevusu</h2><p class="soluk">Dükkanın takviminde açık olan günlerden ve saatlerden birini seç.</p></div>
      <div class="gun-listesi" role="group" aria-label="Gün">${sonrakiGunler(6).map((g) => `<button type="button" class="gun" aria-pressed="${g.anahtar === randevuGun}" data-gun="${g.anahtar}"><span>${g.gunAd}</span><b>${g.gun}</b><span>${g.ay}</span></button>`).join("")}</div>
      <div class="saat-listesi" role="group" aria-label="Saat">${SAATLER.map((s) => `<button type="button" class="chip" aria-pressed="${s === randevuSaat}" data-saat="${s}" ${s === DOLU_SAAT ? 'disabled title="Dolu"' : ""}>${s}</button>`).join("")}</div>
      <div class="btn-row"><button type="button" class="btn btn-primary" data-randevu-kaydet ${randevuGun && randevuSaat ? "" : "disabled"}>${TP.ikon("calendar-check")}Randevuyu kaydet</button>${randevuDuzenle ? `<button type="button" class="btn btn-ghost" data-randevu-vazgec>Vazgeç</button>` : ""}</div>
    </section>`;
  }
  function kodHTML(kod, baslik, metin) {
    return `<section class="panel kod-panel">
      <div><h2>${baslik}</h2><p>${metin}</p></div>
      <div class="kod" role="img" aria-label="${baslik}: ${kod.split("").join(" ")}">${kod.split("").map((c) => `<span>${c}</span>`).join("")}</div>
    </section>`;
  }
  function secildiAsamasi() {
    const q = TP.secilenTeklif(talep), d = q.dukkan;
    const harita = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${d.adres} ${d.ilce} ${d.il}`);
    return `
      <section class="panel">
        <div class="basari-ust">${TP.ikon("handshake")}<div><h2>${esc(d.ad)} ile eşleştin</h2><p>İletişim bilgileri açıldı. Randevu saatini seç ve aracını teslim ederken teslim kodunu söyle.</p></div></div>
        <div class="iletisim-grid">
          <div class="harita" role="img" aria-label="${esc(d.ad)} konumu: ${esc(d.ilce)}, ${esc(d.il)}">
            <div class="harita-pin">${TP.ikon("map-pin")}<span>${esc(d.ad)}</span></div>
            <span class="harita-not">Harita önizlemesi</span>
          </div>
          <div class="iletisim-bilgi">
            <h3>${esc(d.ad)}</h3>
            ${TP.puanRozet(d.puan, d.degerlendirme)}
            <p>${TP.ikon("map-pin")}<span>${esc(d.adres)}<br>${esc(d.ilce)} / ${esc(d.il)}</span></p>
            <p>${TP.ikon("phone")}<span><span class="tel">${esc(d.tel)}</span> · <button type="button" class="link-btn" data-kopyala="${esc(d.tel)}">Kopyala</button></span></p>
            <p>${TP.ikon("clock")}<span>${esc(d.saatler)}</span></p>
            ${d.sahibi ? `<p>${TP.ikon("user")}<span>Yetkili: ${esc(d.sahibi)}</span></p>` : ""}
            <div class="btn-row"><a class="btn btn-secondary btn-sm" href="${harita}" target="_blank" rel="noopener">${TP.ikon("navigation")}Yol tarifi al</a><a class="btn btn-secondary btn-sm" href="tel:${d.tel.replace(/\s/g, "")}">${TP.ikon("phone")}Ara</a></div>
          </div>
        </div>
      </section>
      ${randevuHTML()}
      ${kodHTML(talep.teslimKodu, "Teslim kodun", "Aracı teslim ederken bu kodu dükkana söyle. Dükkan kodu girdiğinde teslim kayda geçer; aracın 4 yönden fotoğrafı, kilometresi ve yakıt seviyesi kaydedilir.")}
      <section class="panel">
        <h2>Sonraki adımlar</h2>
        <ol class="adim-listesi">
          <li>Dükkan aracı inceler ve kesin fiyatı girer. Fiyat değişirse gerekçesini görürsün.</li>
          <li>Kesin fiyatı onaylayıp kartınla ödersin. Ödeme, sen onay verene kadar güvencede bekler.</li>
          <li>Onarım biter; aracını kontrol ederek teslim alır ve onay verirsin.</li>
        </ol>
        <div class="btn-row"><button type="button" class="btn btn-danger btn-sm" data-secim-iptal>${TP.ikon("rotate-ccw")}Seçimi iptal et</button><span class="hint">Aracı teslim etmeden önce iptal ücretsizdir.</span></div>
      </section>`;
  }

  // ---------- 3. Araç dükkanda: teslim kaydı, kesin fiyat ----------
  function teslimKaydiHTML() {
    const tk = talep.teslim;
    const yonler = [["car-front", "Ön"], ["car", "Sol yan"], ["car", "Sağ yan"], ["car-front", "Arka"]];
    return `<section class="panel">
      <div class="panel-head"><div><h2>Aracın dükkanda</h2><p>Teslim kaydı: ${TP.tarihSaat(tk.zaman)}. Bu kayıt olası bir anlaşmazlıkta esas alınır.</p></div><span class="badge badge-success">${TP.ikon("circle-check")}Teslim kodu doğrulandı</span></div>
      <div class="foto-seridi">
        ${yonler.map(([ik, ad]) => `<div class="foto-kare">${TP.ikon(ik)}<span>${ad}</span></div>`).join("")}
        <div class="foto-kare">${TP.ikon("gauge")}<b>${TP.sayi(tk.km)}</b><span>km</span></div>
        <div class="foto-kare">${TP.ikon("fuel")}<b>${esc(tk.yakit)}</b><span>yakıt</span></div>
      </div>
    </section>`;
  }
  function dukkandaAsamasi() {
    const q = TP.secilenTeklif(talep), kf = talep.kesinFiyat;
    let fiyat;
    if (!kf) {
      fiyat = `<section class="panel"><div class="bekleme">${TP.ikon("hourglass")}<div><h2>Dükkan aracı inceliyor</h2><p>Kesin fiyat en geç 24 saat (çalışma saatleri) içinde girilecek ve sana SMS ile bildirilecek. Söküm gerektiren bir inceleme olursa önce onayın istenir.</p></div></div></section>`;
    } else if (!kf.revize) {
      fiyat = `<section class="panel kesin-fiyat">
        <span><span class="badge badge-success">${TP.ikon("circle-check")}Ön teklif onaylandı</span></span>
        <div><p class="alt-baslik">Kesin fiyat</p><div class="buyuk-fiyat">${TP.tl(kf.tutar)}</div><p class="soluk">Dükkan aracı inceledi ve ön teklifteki fiyatı onayladı.</p></div>
        <ul class="kural-listesi">
          <li>${TP.ikon("lock")}<span>Ödemen lisanslı ödeme kuruluşunda bloke tutulur, onarım bitip sen onay verene kadar dükkana geçmez.</span></li>
          <li>${TP.ikon("credit-card")}<span>Kredi kartına taksit seçenekleri ödeme adımında gösterilir.</span></li>
        </ul>
        <div class="btn-row"><button type="button" class="btn btn-primary btn-lg" data-ode>${TP.ikon("shield-check")}Onayla ve güvenle öde</button></div>
      </section>`;
    } else {
      const fark = ((kf.tutar - q.tutar) / q.tutar) * 100;
      fiyat = `<section class="panel kesin-fiyat">
        <span><span class="badge badge-warn">${TP.ikon("triangle-alert")}Fiyat revize edildi · tek revize hakkı kullanıldı</span></span>
        <div><p class="alt-baslik">Kesin fiyat</p><div class="buyuk-fiyat"><s>${TP.tl(q.tutar)}</s>${TP.tl(kf.tutar)} <span class="fark">${fark > 0 ? "+" : ""}%${Math.abs(fark).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</span></div></div>
        <p class="gerekce"><b>Dükkanın gerekçesi:</b> ${esc(kf.gerekce)}</p>
        <div class="foto-seridi"><div class="foto-kare">${talep.fotolar && talep.fotolar[0] ? `<img src="${talep.fotolar[0]}" alt="Revize gerekçe fotoğrafı"><span class="foto-etiket">Gerekçe fotoğrafı</span>` : `${TP.ikon("image")}<span>Gerekçe fotoğrafı</span>`}</div></div>
        <p class="notice">${TP.ikon("info")}<span>Revizeyi onaylamazsan onarım yapılmaz ve aracını <b>ücretsiz</b> geri alırsın.${q.sokumBedeli ? ` Söküme onay verdiysen teklifte yazan ${TP.tl(q.sokumBedeli)} söküm-montaj bedeli uygulanır.` : ""}</span></p>
        <div class="btn-row"><button type="button" class="btn btn-danger" data-reddet>Reddet, aracımı geri alacağım</button><button type="button" class="btn btn-primary btn-lg" data-ode>Revizeyi onayla ve öde</button></div>
      </section>`;
    }
    return teslimKaydiHTML() + fiyat;
  }

  function odemeAc() {
    const q = TP.secilenTeklif(talep), tutar = TP.odenecekTutar(talep);
    const dlg = TP.modal({
      baslik: "Güvenli ödeme",
      alt: "Ödemen lisanslı ödeme kuruluşunda bloke tutulur; sen onay verene kadar dükkana geçmez.",
      icerik: `<div class="odeme-grid">
        <div class="kirilim">
          <div class="satir"><span>${esc(q.dukkan.ad)} · onarım bedeli</span><span>${TP.tl(tutar)}</span></div>
          <div class="satir"><span>Taksit farkı</span><span id="odeme-fark">0 ₺</span></div>
          <div class="satir toplam"><span>Kartından çekilecek</span><span id="odeme-toplam">${TP.tl(tutar)}</span></div>
        </div>
        <fieldset class="taksitler"><legend>Taksit seçenekleri</legend>
          ${TAKSITLER.map(([n, oran], i) => { const top = tutar * (1 + oran); return `<label class="taksit"><input type="radio" name="taksit" value="${n}" ${i === 0 ? "checked" : ""}><span>${n === 1 ? "Tek çekim" : `${n} taksit`}<small>${n === 1 ? "Vade farkı yok" : `${n} × ${TP.tl(top / n)}`}</small></span><b>${TP.tl(top)}</b></label>`; }).join("")}
        </fieldset>
        <p class="hint">Taksit oranları örnektir; banka ve kampanyaya göre değişir.</p>
        <div class="kart-demo">
          <div class="field"><label for="kart-no">Kart numarası</label><input class="input tnum" id="kart-no" value="•••• •••• •••• 4242" disabled></div>
          <div class="satir"><input class="input" value="${esc(talep.iletisim.ad + " " + talep.iletisim.soyad)}" aria-label="Kart üzerindeki ad" disabled><input class="input tnum" value="12/29" aria-label="Son kullanma tarihi" disabled><input class="input tnum" value="•••" aria-label="Güvenlik kodu" disabled></div>
          <p>${TP.ikon("lock")}Prototip: kart bilgisi alınmaz, ödeme ve 3D Secure adımı simüle edilir.</p>
        </div>
        <label class="check" id="sozlesme-kutu"><input type="checkbox" id="sozlesme"><span>Ön bilgilendirme formunu ve mesafeli hizmet sözleşmesini okudum, onaylıyorum.</span></label>
      </div>`,
      butonlar: [
        { metin: "Vazgeç" },
        {
          metin: `${TP.ikon("lock")}<span id="ode-metin">${TP.tl(tutar)} öde</span>`, sinif: "btn-primary", eylem: (d) => {
            if (!d.querySelector("#sozlesme").checked) {
              d.querySelector("#sozlesme-kutu").classList.add("has-error");
              TP.toast("Devam etmek için sözleşmeyi onaylaman gerekiyor.", { tur: "uyari" });
              return false;
            }
            const taksit = Number(d.querySelector("input[name=taksit]:checked").value);
            d.querySelector(".modal-body").innerHTML = `<div class="isleniyor">${TP.ikon("loader-circle")}<b>3D Secure doğrulaması yapılıyor…</b><span>Bankanın doğrulama ekranı simüle ediliyor.</span></div>`;
            d.querySelector(".modal-foot").hidden = true;
            setTimeout(() => {
              d.close();
              guncelle((t) => TP.akis.odemeYap(t, { taksit }));
              window.scrollTo({ top: 0, behavior: "smooth" });
              TP.toast("Ödemen güvenceye alındı. Onarım başlıyor.", { tur: "basari" });
              setTimeout(() => TP.sms(`${TP.tl(odenenToplam())} ödemen güvende. Onarım başladı; tamamlandığında haber vereceğiz.`), 800);
            }, 1500);
            return false;
          },
        },
      ],
    });
    dlg.querySelector(".taksitler").addEventListener("change", () => {
      const n = Number(dlg.querySelector("input[name=taksit]:checked").value);
      const oran = TAKSITLER.find(([x]) => x === n)[1];
      dlg.querySelector("#odeme-fark").textContent = TP.tl(tutar * oran);
      dlg.querySelector("#odeme-toplam").textContent = TP.tl(tutar * (1 + oran));
      dlg.querySelector("#ode-metin").textContent = `${TP.tl(tutar * (1 + oran))} öde`;
    });
    dlg.querySelector("#sozlesme").addEventListener("change", (e) => e.target.closest(".check").classList.remove("has-error"));
  }

  // ---------- 4. Onarımda ----------
  function isGunuEkle(zaman, gun) {
    const d = new Date(zaman);
    let eklenen = 0;
    while (eklenen < gun) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) eklenen++; }
    return d.getTime();
  }
  function planliAdimlar() {
    const q = TP.secilenTeklif(talep);
    const adimlar = ["Hasarlı bölge söküldü, ölçüm yapıldı"];
    if (q.kapsam.includes("kaporta")) adimlar.push("Kaporta düzeltme ve parça değişimi");
    if (q.kapsam.includes("boya")) adimlar.push("Astar, boya ve fırınlama");
    if (q.kapsam.includes("mekanik")) adimlar.push("Mekanik onarım ve test sürüşü");
    if (q.kapsam.includes("elektrik")) adimlar.push("Elektrik arıza onarımı ve testler");
    if (q.kapsam.includes("doseme")) adimlar.push("Döşeme dikimi ve montaj");
    adimlar.push("Montaj, kalite kontrol ve temizlik");
    return adimlar;
  }
  function onarimdaAsamasi() {
    const q = TP.secilenTeklif(talep), o = talep.odeme;
    const tahmini = isGunuEkle(o.zaman, q.sureGun);
    const yapilan = talep.ilerleme || [];
    const kalan = planliAdimlar().slice(Math.max(0, yapilan.length - 1)); // ilk kayıt ödeme satırıdır
    const ek = talep.ekIs;
    return `
      <section class="panel guvence">
        <div class="guvence-ust">${TP.ikon("lock")}<div><span class="alt-baslik">Ödeme güvende</span><b class="tutar">${TP.tl(odenenToplam())}</b><p>${o.taksit > 1 ? `${o.taksit} taksit` : "Tek çekim"} · Ödeme no ${esc(o.ref)} · ${TP.tarih(o.zaman)}${o.ekTutar ? ` · ${TP.tl(o.ekTutar)} ek iş dahil` : ""}</p></div></div>
        <ol class="guvence-akis">
          <li>${TP.ikon("circle-check")}Ödendi</li>
          <li class="simdi">${TP.ikon("lock")}Güvencede bekliyor</li>
          <li>${TP.ikon("hand-coins")}Onayınla dükkana geçer</li>
        </ol>
      </section>
      ${ek && ek.durum === "bekliyor" ? `
      <section class="panel ek-is">
        <span><span class="badge badge-warn">${TP.ikon("triangle-alert")}Onayını bekliyor</span></span>
        <div><p class="alt-baslik">Ek iş talebi</p><div class="buyuk-fiyat" style="font-family:var(--font-baslik);font-size:34px;font-weight:700">+${TP.tl(ek.tutar)}</div></div>
        <p class="gerekce"><b>${esc(q.dukkan.ad)}:</b> ${esc(ek.aciklama)}</p>
        <p class="hint">Ek iş yalnızca senin onayınla yapılır. Onaylarsan tutar ayrıca tahsil edilir ve aynı şekilde güvencede tutulur. Reddedersen onarım ilk kapsamla devam eder.</p>
        <div class="btn-row"><button type="button" class="btn btn-secondary" data-ekis="red">Reddet</button><button type="button" class="btn btn-primary" data-ekis="onay">Onayla ve ${TP.tl(ek.tutar)} öde</button></div>
      </section>` : ""}
      <section class="panel">
        <div class="panel-head"><div><h2>Onarım durumu</h2><p>Tahmini teslim: <b>${TP.tarih(tahmini, { weekday: "long", day: "numeric", month: "long" })}</b>. Gecikme olursa dükkan buradan bildirir.</p></div></div>
        <ol class="zaman-cizelgesi">
          ${yapilan.map((a) => `<li><span class="nokta">${TP.ikon("check")}</span><div><b>${esc(a.metin)}</b><small>${TP.tarih(a.zaman, { day: "numeric", month: "short" })} ${TP.saat(a.zaman)}</small></div></li>`).join("")}
          ${kalan.map((a) => `<li class="gelecek"><span class="nokta"></span><div><b>${esc(a)}</b><small>Planlandı</small></div></li>`).join("")}
        </ol>
      </section>`;
  }

  // ---------- 5. Karşılıklı onay ----------
  function onayAsamasi() {
    const q = TP.secilenTeklif(talep), tm = talep.tamamlanma;
    const once = talep.fotolar && talep.fotolar[0];
    return `
      <section class="panel">
        <div class="basari-ust">${TP.ikon("circle-check")}<div><h2>Onarım tamamlandı</h2><p>${esc(q.dukkan.ad)} onarımı ${TP.tarihSaat(tm.zaman)} tarihinde tamamladı, sonrası fotoğraflarını ve faturayı yükledi.</p></div></div>
        <div class="once-sonra">
          <div class="foto-kare">${once ? `<img src="${once}" alt="Onarım öncesi">` : TP.ikon("car-front")}<span class="foto-etiket">Önce</span></div>
          <div class="foto-kare">${TP.ikon("sparkles")}<span>Onarım sonrası fotoğraflar</span><span class="foto-etiket">Sonra</span></div>
        </div>
        <div class="fatura-satir">${TP.ikon("receipt")}<span>e-Arşiv fatura <b class="tnum">${esc(tm.faturaNo)}</b> · ${TP.tl(odenenToplam())}</span><button type="button" class="link-btn" data-fatura>Görüntüle</button></div>
      </section>
      ${talep.teslimAlma ? "" : kodHTML(talep.teslimAlmaKodu, "Teslim alma kodun", "Aracını teslim alırken önce kontrol et, sonra bu kodu dükkana söyle. Kod girildiğinde 72 saatlik onay süresi başlar.")}
      <section class="panel">
        <div><h2>Karşılıklı onay</h2><p class="soluk">İki taraf da onay verdiğinde ödeme dükkana aktarılır.</p></div>
        <div class="onay-grid">
          <div class="onay-taraf tamam"><span class="baslik-satir">${TP.ikon("store")}Dükkan</span><span>Onarımı tamamladı</span><small>${TP.tarihSaat(tm.zaman)}</small></div>
          <div class="onay-taraf bekliyor"><span class="baslik-satir">${TP.ikon("user")}Sen</span><span>Onayın bekleniyor</span><small>${talep.teslimAlma ? `Otomatik onaya <b data-geri-sayim="${talep.teslimAlma.zaman + TP.OTOMATIK_ONAY_SAAT * 3600e3}"></b>` : "Aracı teslim aldığında onay ver"}</small></div>
        </div>
        ${talep.teslimAlma ? `<p class="notice">${TP.ikon("timer")}<span>Aracını ${TP.tarihSaat(talep.teslimAlma.zaman)} tarihinde teslim aldın. 72 saat içinde onay vermez ya da sorun bildirmezsen ödeme otomatik onaylanır.</span></p>` : ""}
        <div class="btn-row"><button type="button" class="btn btn-danger" data-sorun>${TP.ikon("flag")}Sorun bildir</button><button type="button" class="btn btn-primary btn-lg" data-onayla>${TP.ikon("circle-check")}Aracımı teslim aldım, onaylıyorum</button></div>
        <p class="hint">Onayladığında ${TP.tl(odenenToplam())} dükkana aktarılır. Sonradan çıkan sorunlar ${q.garantiAy} ay işçilik garantisi kapsamındadır.</p>
      </section>`;
  }
  function onayVer() {
    const q = TP.secilenTeklif(talep);
    TP.modal({
      baslik: "Onarımı onaylıyor musun?",
      icerik: `<p>Onayladığında <b>${TP.tl(odenenToplam())}</b> ${esc(q.dukkan.ad)} hesabına aktarılır. Bu işlem geri alınamaz.</p>
        <ul class="kural-listesi">
          <li>${TP.ikon("clipboard-check")}<span>Aracını gün ışığında kontrol ettin mi? Boya tonu, parça aralıkları, ikaz lambaları ve iç temizlik.</span></li>
          <li>${TP.ikon("shield")}<span>Sonradan çıkan sorunlar ${q.garantiAy} ay işçilik garantisi kapsamında bu sayfadan iletilebilir.</span></li>
        </ul>`,
      butonlar: [
        { metin: "Henüz değil" },
        { metin: "Onaylıyorum", sinif: "btn-primary", eylem: () => {
          guncelle((t) => TP.akis.musteriOnayla(t));
          window.scrollTo({ top: 0, behavior: "smooth" });
          TP.toast("Onayın alındı. Ödeme dükkana aktarıldı.", { tur: "basari" });
        } },
      ],
    });
  }
  function sorunBildir() {
    TP.modal({
      baslik: "Sorun bildir", alt: "Ödeme, sorun çözülene kadar bekletilir.",
      icerik: `
        <fieldset class="secenekler"><legend class="label">Sorun ne?</legend>${["İşçilik kalitesi", "Eksik veya yapılmamış iş", "Araçta yeni hasar", "Fiyat anlaşmazlığı", "Diğer"].map((n, i) => `<label><input type="radio" name="neden" value="${n}" ${i === 0 ? "checked" : ""}>${n}</label>`).join("")}</fieldset>
        <div class="field"><label for="sorun-aciklama">Açıklama</label><textarea class="textarea" id="sorun-aciklama" placeholder="Örn: Kapı ile çamurluk arasındaki boşluk eşit değil, boya tonunda fark var."></textarea><span class="field-error">Sorunu birkaç kelimeyle anlat.</span></div>
        <div class="field"><label for="sorun-foto">Fotoğraf <span class="opt">İsteğe bağlı</span></label><input type="file" id="sorun-foto" accept="image/*" multiple></div>
        <ul class="kural-listesi">
          <li>${TP.ikon("store")}<span>Dükkana 48 saat içinde çözüm önerme hakkı tanınır.</span></li>
          <li>${TP.ikon("scale")}<span>Anlaşma olmazsa TamirPort arabuluculuk yapar; gerekirse bağımsız eksper görüşü alınır.</span></li>
        </ul>`,
      butonlar: [
        { metin: "Vazgeç" },
        { metin: "Sorunu bildir", sinif: "btn-danger", eylem: (d) => {
          const ac = d.querySelector("#sorun-aciklama");
          if (ac.value.trim().length < 5) { ac.closest(".field").classList.add("has-error"); ac.focus(); return false; }
          const neden = d.querySelector("input[name=neden]:checked").value;
          guncelle((t) => TP.akis.itirazAc(t, { neden, aciklama: ac.value.trim() }));
          window.scrollTo({ top: 0, behavior: "smooth" });
          TP.toast("Sorun bildirimin alındı. Ödeme bekletiliyor.", { tur: "uyari" });
        } },
      ],
    });
  }
  function faturaAc() {
    const q = TP.secilenTeklif(talep), tm = talep.tamamlanma || { zaman: Date.now(), faturaNo: "-" };
    const toplam = odenenToplam(), matrah = toplam / 1.2;
    TP.modal({
      baslik: "e-Arşiv fatura", alt: `${esc(tm.faturaNo)} · ${TP.tarih(tm.zaman, { day: "numeric", month: "long", year: "numeric" })}`,
      icerik: `<div class="kirilim">
          <div class="satir"><span>Satıcı</span><span>${esc(q.dukkan.ad)}</span></div>
          <div class="satir"><span>Alıcı</span><span>${esc(talep.iletisim.ad)} ${esc(talep.iletisim.soyad)}</span></div>
          <div class="satir"><span>Hizmet</span><span>${q.kapsam.map((k) => V.kategori(k).ad).join(" + ")} onarımı · ${esc(TP.aracAdi(talep.arac))}</span></div>
          <div class="satir"><span>Matrah</span><span>${TP.tl(matrah)}</span></div>
          <div class="satir"><span>KDV (%20)</span><span>${TP.tl(toplam - matrah)}</span></div>
          <div class="satir toplam"><span>Toplam</span><span>${TP.tl(toplam)}</span></div>
        </div>
        <p class="hint">Faturayı dükkan keser ve onarımı tamamlarken yükler. TamirPort, komisyonu için dükkana ayrıca fatura keser. Prototipte PDF gösterilmez.</p>`,
      butonlar: [{ metin: "Kapat" }],
    });
  }

  // ---------- Uyuşmazlık ----------
  function itirazAsamasi() {
    const it = talep.itiraz, q = TP.secilenTeklif(talep);
    const durum = (adim) => ({ dukkan: ["tamam", "aktif", "", ""], arabuluculuk: ["tamam", "tamam", "aktif", ""] }[it.durum] || [])[adim] || "";
    const adimlar = [["Bildirim alındı", TP.tarihSaat(it.zaman)], ["Dükkanın çözüm önerisi", "48 saat içinde"], ["TamirPort arabuluculuğu", "Gerekirse bağımsız eksper"], ["Karar ve ödeme", "Hedef 7 iş günü"]];
    return `
      <section class="panel">
        <span><span class="badge badge-danger badge-dot">Ödeme bekletiliyor</span></span>
        <div><h2>Sorun bildirdin</h2><p class="soluk">${esc(it.neden)}: “${esc(it.aciklama)}”</p></div>
        <ol class="zaman-cizelgesi">${adimlar.map(([ad, alt], i) => `<li class="${durum(i) === "tamam" ? "" : "gelecek"}"><span class="nokta">${durum(i) === "tamam" ? TP.ikon("check") : ""}</span><div><b>${ad}${durum(i) === "aktif" ? ` <span class="badge badge-warn">Şu an</span>` : ""}</b><small>${alt}</small></div></li>`).join("")}</ol>
      </section>
      ${it.durum === "dukkan" ? `
      <section class="panel">
        <p class="alt-baslik">Dükkanın önerisi</p>
        <h2>${it.oneriTuru === "iade" ? "Kısmi iade" : "Ücretsiz düzeltme"}</h2>
        <p class="gerekce"><b>${esc(q.dukkan.ad)}:</b> “${esc(it.oneri || "Aracı yeniden kontrol edip bildirdiğin sorunu ücretsiz düzelteceğiz. İşlem 1 iş günü sürer; bittiğinde fotoğraflarını paylaşacağız.")}”</p>
        <div class="btn-row"><button type="button" class="btn btn-secondary" data-itiraz="red">Kabul etmiyorum, arabuluculuk iste</button><button type="button" class="btn btn-primary" data-itiraz="kabul">Öneriyi kabul et</button></div>
        <p class="hint">Öneriyi kabul edersen düzeltme tamamlandıktan sonra ödeme dükkana aktarılır.</p>
      </section>` : ""}
      ${it.durum === "arabuluculuk" ? `
      <section class="panel"><div class="bekleme">${TP.ikon("scale")}<div><h2>Arabuluculuk başladı</h2><p>TamirPort ekibi 1 iş günü içinde seni ve dükkanı arayacak. Gerekirse aracın bağımsız bir eksper tarafından incelenmesini planlarız; eksper ücreti haksız çıkan tarafa aittir.</p></div></div></section>` : ""}`;
  }

  // ---------- 6. Tamamlandı: değerlendirme ve üyelik ----------
  function yildizSec(kriter, etiket, kucuk) {
    const deger = puanlar[kriter];
    return `<span class="yildiz-sec${kucuk ? " kucuk" : ""}" role="radiogroup" aria-label="${etiket}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${n <= deger ? "dolu" : ""}" data-yildiz="${n}" data-kriter="${kriter}" role="radio" aria-checked="${n === deger}" aria-label="${n} yıldız">★</button>`).join("")}</span>`;
  }
  function degerlendirmeHTML() {
    const q = TP.secilenTeklif(talep);
    if (talep.degerlendirme) {
      const dg = talep.degerlendirme;
      return `<section class="panel"><div class="basari-ust">${TP.ikon("star")}<div><h2>Değerlendirmen için teşekkürler</h2><p>Yorumun "Doğrulanmış iş" rozetiyle ${esc(q.dukkan.ad)} profilinde yayınlandı. Dükkan bir kez yanıt verebilir.</p></div></div>
        <article class="yorum"><header><b>${esc(talep.iletisim.ad)} ${esc(talep.iletisim.soyad[0] || "")}.</b>${TP.yildiz(dg.puan)}<span class="soluk">az önce</span></header>${dg.yorum ? `<p>${esc(dg.yorum)}</p>` : ""}<footer><span class="badge badge-success">${TP.ikon("badge-check")}Doğrulanmış iş</span><span class="soluk">${esc(TP.aracAdi(talep.arac))}</span></footer></article></section>`;
    }
    return `<section class="panel">
      <div><h2>${esc(q.dukkan.ad)} dükkanını değerlendir</h2><p class="soluk">Puanlar yalnızca tamamlanan işlerden gelir ve diğer kullanıcıların karar vermesine yardım eder. 30 gün içinde değerlendirebilirsin.</p></div>
      <div class="kriter-sec">
        <div class="satir"><b>Genel puan</b>${yildizSec("genel", "Genel puan")}</div>
        <div class="satir"><span>İşçilik</span>${yildizSec("iscilik", "İşçilik", true)}</div>
        <div class="satir"><span>Fiyat / performans</span>${yildizSec("fiyat", "Fiyat / performans", true)}</div>
        <div class="satir"><span>Zamanında teslim</span>${yildizSec("zaman", "Zamanında teslim", true)}</div>
        <div class="satir"><span>İletişim</span>${yildizSec("iletisim", "İletişim", true)}</div>
      </div>
      <div class="field"><label for="yorum">Yorum <span class="opt">İsteğe bağlı</span></label><textarea class="textarea" id="yorum" maxlength="600" placeholder="Deneyimini diğer araç sahipleriyle paylaş."></textarea></div>
      <div class="btn-row"><button type="button" class="btn btn-primary" data-degerlendir>Değerlendirmeyi gönder</button></div>
    </section>`;
  }
  function tamamlandiAsamasi() {
    const q = TP.secilenTeklif(talep);
    const garanti = new Date(talep.onayZamani);
    garanti.setMonth(garanti.getMonth() + q.garantiAy);
    const uye = TP.durumOku().uye;
    return `
      <section class="panel">
        <div class="basari-ust">${TP.ikon("badge-check")}<div><h2>İşlem tamamlandı</h2><p>${talep.otomatikOnay ? "72 saat içinde sorun bildirilmediği için ödeme otomatik onaylandı" : "Onay verdin"} ve ödeme ${TP.tarihSaat(talep.onayZamani)} tarihinde dükkana aktarıldı.</p></div></div>
        <dl class="istatlar">
          <div class="istat"><dt>Ödenen</dt><dd>${TP.tl(odenenToplam())}</dd></div>
          <div class="istat"><dt>Garanti bitişi</dt><dd>${TP.tarih(garanti, { day: "numeric", month: "short", year: "numeric" })}</dd></div>
          <div class="istat"><dt>Parça</dt><dd>${TP.PARCA[q.parcaTuru].replace(" parça", "")}</dd></div>
          <div class="istat"><dt>Fatura</dt><dd><button type="button" class="link-btn" data-fatura>Görüntüle</button></dd></div>
        </dl>
        ${talep.itiraz && talep.itiraz.sonuc ? `<p class="notice">${TP.ikon("scale")}<span>Uyuşmazlık sonucu: ${esc(talep.itiraz.sonuc)}</span></p>` : ""}
        <p class="notice">${TP.ikon("shield")}<span>Onarımla ilgili bir sorun çıkarsa ${q.garantiAy} ay işçilik garantisi kapsamında buradan garanti talebi açabilirsin. <button type="button" class="link-btn" data-garanti>Garanti talebi aç</button></span></p>
      </section>
      ${degerlendirmeHTML()}
      ${uye ? `<section class="panel"><div class="basari-ust">${TP.ikon("warehouse")}<div><h2>Aracın Garajım'da</h2><p>Bu talep, faturası ve garanti bilgisiyle hesabında saklanıyor.</p></div></div><div class="btn-row"><a class="btn btn-secondary" href="musteri-paneli.html">Müşteri paneline git</a></div></section>`
        : `<section class="panel"><div class="basari-ust">${TP.ikon("warehouse")}<div><h2>Aracını Garajım'a kaydet</h2><p>Hesap oluşturursan bu talep fatura ve garanti bilgisiyle saklanır, bir dahaki sefere formu tek tıkla doldurursun. Telefonunla girişe devam edebilirsin, şifre isteğe bağlı.</p></div></div>
          <div class="btn-row"><button type="button" class="btn btn-primary" data-hesap-olustur>Hesabımı oluştur</button><a class="btn btn-ghost" href="musteri-paneli.html">Müşteri panelini gör</a></div></section>`}`;
  }
  function iptalAsamasi() {
    return `<section class="panel">
      <div class="bekleme">${TP.ikon("circle-x")}<div><h2>Talep kapandı</h2><p>${esc(talep.iptalNedeni || "Bu talep kapatıldı.")}</p></div></div>
      <div class="btn-row"><button type="button" class="btn btn-primary" data-yeniden-yayinla>${TP.ikon("refresh-cw")}Talebi yeniden yayınla</button><a class="btn btn-secondary" href="index.html#teklif-al">Yeni talep oluştur</a></div>
    </section>`;
  }

  // ---------- Yan panel ----------
  function yanCiz() {
    const q = TP.secilenTeklif(talep);
    const fotolar = talep.fotolar || [];
    $("#yan-panel").innerHTML = `
      ${q ? `<section class="yan-kart"><h2>Seçilen teklif</h2>
        <div class="secim-ozet">${TP.dukkanLogo(q.dukkan, "kucuk")}<div><b>${esc(q.dukkan.ad)}</b><div class="soluk">${TP.PARCA[q.parcaTuru]} · ${q.garantiAy} ay garanti</div></div></div>
        <dl><div><dt>Ön teklif</dt><dd>${TP.tl(q.tutar)}</dd></div>${talep.kesinFiyat ? `<div><dt>Kesin fiyat</dt><dd>${TP.tl(talep.kesinFiyat.tutar)}</dd></div>` : ""}${talep.odeme ? `<div><dt>Ödeme</dt><dd>${talep.odeme.durum === "aktarildi" ? "Dükkana aktarıldı" : "Güvende (bloke)"}</dd></div>` : ""}</dl>
      </section>` : ""}
      <section class="yan-kart"><h2>Talep detayı</h2>
        ${fotolar.length ? `<div class="yan-foto">${fotolar.map((f, i) => `<img src="${f}" alt="Hasar fotoğrafı ${i + 1}">`).join("")}</div>` : `<div class="yan-bos">${TP.ikon("image")}<span>Fotoğraf eklenmedi.${talep.asama === "teklif" ? " Fotoğraf eklemek daha isabetli teklif almanı sağlar." : ""}</span>${talep.asama === "teklif" ? `<label class="btn btn-secondary btn-sm" for="ek-foto">${TP.ikon("image-plus")}Fotoğraf ekle</label><input type="file" id="ek-foto" accept="image/*" multiple class="gizli-metin">` : ""}</div>`}
        <p class="yan-aciklama${talep.aciklama ? "" : " soluk"}">${talep.aciklama ? esc(talep.aciklama) : "Açıklama eklenmedi."}</p>
        <dl>
          <div><dt>Yıl · paket</dt><dd>${esc(TP.aracDetay(talep.arac))}</dd></div>
          <div><dt>Araç durumu</dt><dd>${talep.yuruyor === false ? "Yürür durumda değil" : "Yürür durumda"}</dd></div>
          <div><dt>Konum</dt><dd>${esc(talep.ilce)}, ${esc(talep.il)}</dd></div>
          <div><dt>İletişim</dt><dd>${esc(talep.iletisim.ad)} ${esc((talep.iletisim.soyad || "")[0] || "")}. · ${TP.telMaske(talep.iletisim.tel)}</dd></div>
        </dl>
      </section>
      <section class="yan-kart"><h2>Talep geçmişi</h2>
        <ol class="olaylar">${(talep.olaylar || []).slice().reverse().map((o) => `<li class="${o.kim || ""}"><span>${esc(o.metin)}<small>${TP.tarih(o.zaman, { day: "numeric", month: "short" })} ${TP.saat(o.zaman)}</small></span></li>`).join("")}</ol>
      </section>
      <section class="yan-kart"><h2>Yardım</h2>
        <p class="yan-aciklama">Bir sorun mu var? Destek ekibine <b class="tnum">0850 000 00 00</b> numarasından ulaşabilirsin.</p>
        <div class="btn-row"><a class="btn btn-secondary btn-sm" href="akis.html#kurallar">${TP.ikon("book-open")}Karşılıklı kurallar</a>${talep.asama === "teklif" ? `<button type="button" class="btn btn-danger btn-sm" data-talep-iptal>Talebi iptal et</button>` : ""}</div>
      </section>`;
  }

  // ---------- Zamanlayıcılar ----------
  function sayaclar() {
    document.querySelectorAll("[data-geri-sayim]").forEach((el) => {
      const kalan = Number(el.dataset.geriSayim) - Date.now();
      el.textContent = kalan > 0 ? TP.sure(kalan) + (el.dataset.sonek || "") : "Süre doldu";
    });
  }
  function yeniTeklifKontrol() {
    if (talep.asama !== "teklif") return;
    const gorunen = TP.gorunurTeklifler(talep);
    const yeniler = gorunen.filter((q) => !gorunenIdler.has(q.id));
    if (!yeniler.length) return;
    const ilk = gorunenIdler.size === 0;
    yeniler.forEach((q) => { gorunenIdler.add(q.id); yeniGelenler.add(q.id); });
    ozetCiz();
    icerikCiz();
    sayaclar();
    const q = yeniler[yeniler.length - 1];
    TP.toast(`Yeni teklif: <b>${esc(q.dukkan.ad)}</b> · ${TP.tl(q.tutar)}`, { tur: "bilgi", ikon: "inbox" });
    if (ilk) TP.sms(`İlk teklifin geldi! ${esc(q.dukkan.ad)}: ${TP.tl(q.tutar)}. Diğer teklifler geldikçe takip sayfanda görünecek.`);
  }

  // ---------- Prototip kontrolleri ----------
  function demoCiz(panel) {
    const asamalar = [["teklif", "Teklifler"], ["secildi", "Dükkan seçildi"], ["dukkanda", "Araç dükkanda"], ["onarimda", "Onarımda"], ["onay", "Karşılıklı onay"], ["tamamlandi", "Tamamlandı"], ["itiraz", "Sorun bildirildi"]];
    const eylemler = {
      teklif: [["yeni-teklif", "Yeni teklif gelsin"], ["tum-teklifler", "Bekleyen teklifleri göster"]],
      secildi: [["teslim-al", "Dükkan aracı teslim aldı"]],
      dukkanda: talep.kesinFiyat ? [] : [["fiyat-ayni", "Dükkan ön teklifi onayladı"], ["fiyat-revize", "Dükkan fiyatı revize etti"]],
      onarimda: [["ilerleme", "İlerleme ekle"], ...(talep.ekIs ? [] : [["ek-is", "Ek iş talep et"]]), ["tamamla", "Onarımı tamamla"]],
      onay: talep.teslimAlma ? [["otomatik-onay", "72 saat doldu"]] : [["teslim-et", "Aracı müşteriye teslim et"]],
      itiraz: talep.itiraz && talep.itiraz.durum === "arabuluculuk" ? [["karar", "Arabuluculuk kararı: kısmi iade"]] : [],
    }[talep.asama] || [];
    panel.innerHTML = `<h2>Prototip kontrolleri</h2>
      <p>Dükkan tarafını beklemeden akışı ilerletmek için. Aynı işlemleri Dükkan Paneli'nden de yapabilirsin.</p>
      <div class="demo-group"><span>Aşamaya git</span><div class="demo-buttons">${asamalar.map(([k, ad]) => `<button type="button" data-demo-asama="${k}" ${talep.asama === k ? 'aria-current="step"' : ""}>${ad}</button>`).join("")}</div></div>
      ${eylemler.length ? `<div class="demo-group"><span>Dükkan tarafını simüle et</span><div class="demo-buttons">${eylemler.map(([k, ad]) => `<button type="button" data-demo-eylem="${k}">${ad}</button>`).join("")}</div></div>` : ""}
      <div class="demo-group"><span>Diğer</span><div class="demo-buttons"><button type="button" data-demo-eylem="dukkan-paneli">Dükkan paneli</button><button type="button" data-demo-eylem="sifirla">Tüm demo verisini sil</button></div></div>`;
  }
  function demoEylem(ad) {
    const q = TP.secilenTeklif(talep);
    switch (ad) {
      case "yeni-teklif": {
        const mevcut = new Set(talep.teklifler.map((x) => x.dukkan.id));
        const aday = V.dukkanlar.find((d) => !mevcut.has(d.id) && d.id !== V.DEMO_DUKKAN && d.kategoriler.some((k) => talep.kategoriler.includes(k)))
          || { ...V.dukkanlar[1], id: "s" + Date.now(), ad: "Yıldız Oto Servis", kisa: "YO", il: talep.il, ilce: talep.ilce, kategoriler: talep.kategoriler.slice() };
        const r = V.rastgele(talep.id + Date.now());
        const yeni = V.teklifOlustur(aday, talep, r, 0);
        yeni.id += "-" + Date.now().toString(36);
        yeni.gelisSn = (Date.now() - talep.olusturma) / 1000;
        yeni.zaman = Date.now();
        talep.teklifler.push(yeni);
        kaydet();
        yeniTeklifKontrol();
        return;
      }
      case "tum-teklifler": talep.teklifler.forEach((x) => { x.gelisSn = 0; }); kaydet(); yeniTeklifKontrol(); return;
      case "teslim-al": guncelle((t) => TP.akis.aracTeslimAl(t, { km: 48250, yakit: "1/2" })); TP.sms("Aracın dükkana teslim edildi. Teslim kaydı ve fotoğraflar takip sayfanda."); return;
      case "fiyat-ayni": guncelle((t) => TP.akis.kesinFiyatGir(t, { tutar: q.tutar })); TP.sms(`Kesin fiyat: ${TP.tl(q.tutar)} (ön teklifle aynı). Onaylayıp güvenle ödeyebilirsin.`); return;
      case "fiyat-revize": {
        const tutar = Math.round((q.tutar * 1.12) / 50) * 50;
        guncelle((t) => TP.akis.kesinFiyatGir(t, { tutar, gerekce: "Sağ far bağlantı braketi kırık, sökümde görüldü. Yenisiyle değişmesi gerekiyor; fotoğrafı ekledim." }));
        TP.sms(`Dükkan fiyatı revize etti: ${TP.tl(tutar)}. Gerekçeyi görüp onaylayabilir ya da reddedebilirsin.`);
        return;
      }
      case "ilerleme": {
        const plan = planliAdimlar();
        const sira = Math.min(Math.max(0, (talep.ilerleme || []).length - 1), plan.length - 1);
        guncelle((t) => TP.akis.ilerlemeEkle(t, plan[sira]));
        return;
      }
      case "ek-is": guncelle((t) => TP.akis.ekIsTalep(t, { tutar: 650, aciklama: "Sağ sis farı çerçevesi kırık çıktı; değişmesini öneriyoruz. Fotoğrafı ekledik." })); TP.sms("Dükkan ek iş talep etti (650 ₺). Onayın olmadan yapılmaz."); return;
      case "tamamla": guncelle((t) => TP.akis.onarimTamamla(t, { faturaNo: "GIB2026" + String(Date.now()).slice(-9) })); TP.sms("Onarım tamamlandı! Aracını teslim alırken teslim alma kodunu dükkana söyle."); return;
      case "teslim-et": guncelle((t) => TP.akis.aracTeslimEt(t)); return;
      case "otomatik-onay":
        guncelle((t) => {
          TP.akis.musteriOnayla(t);
          t.otomatikOnay = true;
          t.olaylar[t.olaylar.length - 1].metin = "72 saat içinde sorun bildirilmedi; ödeme otomatik onaylandı ve dükkana aktarıldı.";
        });
        return;
      case "karar": guncelle((t) => TP.akis.itirazCoz(t, "Arabuluculuk sonucu 1.000 ₺ kısmi iade yapıldı, kalan tutar dükkana aktarıldı.")); return;
      case "dukkan-paneli": location.href = "dukkan-paneli.html#isler"; return;
      case "sifirla": TP.sifirla(); try { sessionStorage.clear(); } catch (e) { /* yok say */ } location.reload(); return;
      default:
    }
  }

  // ---------- Olaylar ----------
  function olaylariBagla() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      const b = (s) => t.closest(s);
      let el;
      if ((el = b("[data-sirala]"))) { siralama = el.dataset.sirala; icerikCiz(); }
      else if ((el = b("[data-detay]"))) detayAc(el.dataset.detay);
      else if ((el = b("[data-sec]"))) secimOnay(el.dataset.sec);
      else if (b("[data-karsilastir-temizle]")) { karsilastirma.clear(); icerikCiz(); karsilastirBarCiz(); }
      else if (b("[data-karsilastir-ac]")) karsilastirAc();
      else if ((el = b("[data-karsilastir-sec]"))) { el.closest("dialog").close(); secimOnay(el.dataset.karsilastirSec); }
      else if ((el = b("[data-gun]"))) { randevuGun = el.dataset.gun; icerikCiz(); }
      else if ((el = b("[data-saat]"))) { randevuSaat = el.dataset.saat; icerikCiz(); }
      else if (b("[data-randevu-kaydet]")) {
        const [s, d] = randevuSaat.split(":").map(Number);
        const zaman = new Date(randevuGun + "T00:00:00");
        zaman.setHours(s, d, 0, 0);
        randevuDuzenle = false;
        guncelle((x) => TP.akis.randevuKaydet(x, zaman.getTime()));
        TP.toast(`Randevun kaydedildi: ${TP.tarihSaat(zaman)}`, { tur: "basari" });
      }
      else if (b("[data-randevu-degistir]")) { randevuDuzenle = true; icerikCiz(); }
      else if (b("[data-randevu-vazgec]")) { randevuDuzenle = false; icerikCiz(); }
      else if ((el = b("[data-kopyala]"))) TP.kopyala(el.dataset.kopyala, "Telefon numarası kopyalandı.");
      else if (b("[data-secim-iptal]")) secimIptal();
      else if (b("[data-ode]")) odemeAc();
      else if (b("[data-reddet]")) fiyatReddet();
      else if ((el = b("[data-ekis]"))) {
        const onay = el.dataset.ekis === "onay";
        guncelle((x) => TP.akis.ekIsYanit(x, onay));
        TP.toast(onay ? "Ek iş onaylandı; ödemesi güvenceye alındı." : "Ek iş reddedildi. Onarım ilk kapsamla sürüyor.", { tur: onay ? "basari" : "bilgi" });
      }
      else if (b("[data-fatura]")) faturaAc();
      else if (b("[data-onayla]")) onayVer();
      else if (b("[data-sorun]")) sorunBildir();
      else if ((el = b("[data-itiraz]"))) {
        if (el.dataset.itiraz === "kabul") {
          guncelle((x) => TP.akis.itirazCoz(x, "Dükkan sorunu ücretsiz düzeltti; ödeme dükkana aktarıldı."));
          TP.toast("Öneriyi kabul ettin. Düzeltme sonrası ödeme aktarıldı.", { tur: "basari" });
        } else {
          guncelle((x) => { x.itiraz.durum = "arabuluculuk"; x.olaylar.push({ zaman: Date.now(), metin: "Müşteri dükkanın önerisini kabul etmedi; arabuluculuk başladı.", kim: "platform" }); });
        }
      }
      else if ((el = b("[data-yildiz]"))) {
        const n = Number(el.dataset.yildiz);
        puanlar[el.dataset.kriter] = n;
        el.parentElement.querySelectorAll("button").forEach((y, i) => { y.classList.toggle("dolu", i < n); y.setAttribute("aria-checked", String(i + 1 === n)); });
      }
      else if (b("[data-degerlendir]")) degerlendir();
      else if (b("[data-hesap-olustur]")) hesapOlustur();
      else if (b("[data-garanti]")) garantiTalebi();
      else if ((el = b("[data-bant-kapat]"))) { try { sessionStorage.setItem("tp-bant-" + el.dataset.bantKapat, "1"); } catch (err) { /* yok say */ } ustBantCiz(); }
      else if (b("[data-talep-iptal]")) talepIptal();
      else if (b("[data-yeniden-yayinla]")) {
        guncelle((x) => { TP.akis.teklifeDon(x, "Talep yeniden yayınlandı; teklif toplama süresi yeniden başladı."); x.olusturma = Date.now(); });
        gorunenIdler = new Set();
      }
      else if ((el = b("[data-demo-asama]"))) {
        guncelle((x) => TP.akis.asamayaGetir(x, el.dataset.demoAsama));
        gorunenIdler = new Set(TP.gorunurTeklifler(talep).map((q) => q.id));
      }
      else if ((el = b("[data-demo-eylem]"))) demoEylem(el.dataset.demoEylem);
    });
    document.addEventListener("change", async (e) => {
      const t = e.target;
      if (t.id === "sadece-tam") { sadeceTam = t.checked; icerikCiz(); }
      if (t.dataset.karsilastir) {
        if (t.checked) karsilastirma.add(t.dataset.karsilastir); else karsilastirma.delete(t.dataset.karsilastir);
        icerikCiz();
        karsilastirBarCiz();
      }
      if (t.id === "ek-foto") {
        const dosyalar = Array.from(t.files).filter((f) => f.type.startsWith("image/")).slice(0, 6);
        const eklenen = [];
        for (const f of dosyalar) { try { eklenen.push(await TP.fotoKucult(f)); } catch (err) { /* atla */ } }
        if (!eklenen.length) return;
        guncelle((x) => { x.fotolar = (x.fotolar || []).concat(eklenen).slice(0, 6); x.olaylar.push({ zaman: Date.now(), metin: `${eklenen.length} fotoğraf eklendi; teklif veren dükkanlara bildirildi.`, kim: "musteri" }); });
        TP.toast("Fotoğraflar eklendi ve teklif veren dükkanlara bildirildi.", { tur: "basari" });
      }
    });
  }

  function secimIptal() {
    TP.modal({
      baslik: "Seçimi iptal et",
      icerik: `<p>Aracı henüz teslim etmediğin için iptal ücretsiz. Ne yapmak istersin?</p>
        <ul class="kural-listesi"><li>${TP.ikon("rotate-ccw")}<span><b>Diğer tekliflere dön:</b> geçerliliği süren teklifler yeniden açılır.</span></li><li>${TP.ikon("circle-x")}<span><b>Talebi kapat:</b> hiçbir dükkanla devam etmezsin.</span></li></ul>`,
      butonlar: [
        { metin: "Talebi kapat", sinif: "btn-danger", eylem: () => guncelle((x) => TP.akis.iptal(x, "Dükkan seçimini ve talebini iptal ettin. Ücret alınmadı.")) },
        { metin: "Diğer tekliflere dön", sinif: "btn-primary", eylem: () => {
          guncelle((x) => TP.akis.teklifeDon(x, "Seçim iptal edildi; diğer teklifler yeniden açıldı."));
          gorunenIdler = new Set(TP.gorunurTeklifler(talep).map((q) => q.id));
        } },
      ],
    });
  }
  function fiyatReddet() {
    TP.modal({
      baslik: "Revize fiyatı reddediyor musun?",
      icerik: `<p>Onarım yapılmaz ve aracını ücretsiz geri alırsın. Ödeme alınmaz. İstersen talebini yeniden yayınlayıp başka dükkanlardan teklif alabilirsin.</p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Reddet", sinif: "btn-danger", eylem: () => { guncelle((x) => TP.akis.fiyatReddet(x)); TP.toast("Revize reddedildi. Aracını ücretsiz teslim alabilirsin."); } }],
    });
  }
  function talepIptal() {
    TP.modal({
      baslik: "Talebi iptal et",
      icerik: `<p>Dükkan seçmeden önce iptal ücretsizdir. Teklif veren dükkanlara talebin kapandığı bildirilir.</p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Talebi iptal et", sinif: "btn-danger", eylem: () => guncelle((x) => TP.akis.iptal(x, "Talebini iptal ettin. Teklif veren dükkanlara bildirildi.")) }],
    });
  }
  function degerlendir() {
    if (!puanlar.genel) { TP.toast("Genel puan için yıldız seç.", { tur: "uyari" }); return; }
    const k = { iscilik: puanlar.iscilik || puanlar.genel, fiyat: puanlar.fiyat || puanlar.genel, zaman: puanlar.zaman || puanlar.genel, iletisim: puanlar.iletisim || puanlar.genel };
    guncelle((x) => TP.akis.degerlendir(x, { puan: puanlar.genel, kriterler: k, yorum: $("#yorum").value.trim() }));
    TP.toast("Değerlendirmen yayınlandı. Teşekkürler!", { tur: "basari" });
  }
  function hesapOlustur() {
    TP.modal({
      baslik: "Hesabını oluştur", alt: "Telefon numaran zaten doğrulandı. Şifre isteğe bağlı; SMS koduyla girişe devam edebilirsin.",
      icerik: `<div class="field"><label>Telefon</label><input class="input tnum" value="${TP.telMaske(talep.iletisim.tel)}" disabled></div>
        <div class="field"><label for="hesap-eposta">E-posta</label><input class="input" id="hesap-eposta" type="email" autocomplete="email" placeholder="ornek@eposta.com"><span class="field-error">Geçerli bir e-posta adresi yaz.</span></div>
        <div class="field"><label for="hesap-sifre">Şifre <span class="opt">İsteğe bağlı</span></label><input class="input" id="hesap-sifre" type="password" autocomplete="new-password"></div>
        <p class="hint">Bu telefonla açtığın tüm talepler hesabına otomatik bağlanır.</p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Hesabı oluştur", sinif: "btn-primary", eylem: (d) => {
        const ep = d.querySelector("#hesap-eposta");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ep.value.trim())) { ep.closest(".field").classList.add("has-error"); ep.focus(); return false; }
        const s = TP.durumOku();
        s.uye = { eposta: ep.value.trim(), zaman: Date.now(), tel: talep.iletisim.tel, ad: talep.iletisim.ad, soyad: talep.iletisim.soyad };
        s.oturumTel = talep.iletisim.tel;
        TP.durumYaz(s);
        ciz();
        TP.toast("Hesabın oluşturuldu. Taleplerin Müşteri Paneli'nde.", { tur: "basari" });
      } }],
    });
  }
  function garantiTalebi() {
    TP.modal({
      baslik: "Garanti talebi", alt: "Talebin dükkana iletilir; dükkan 3 iş günü içinde yanıt verir.",
      icerik: `<div class="field"><label for="garanti-aciklama">Sorun nedir?</label><textarea class="textarea" id="garanti-aciklama" placeholder="Örn: Boyalı parçada kabarma oluştu."></textarea></div>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Talebi gönder", sinif: "btn-primary", eylem: () => { TP.toast("Garanti talebin dükkana iletildi.", { tur: "basari" }); } }],
    });
  }

  TP.sayfaKur(() => {
    yukle();
    ciz();
    olaylariBagla();
    demo = TP.demoPanel(demoCiz);
    setInterval(() => { sayaclar(); yeniTeklifKontrol(); }, 1000);
    // Dükkan panelinden gelen değişiklikleri (yeni teklif, teslim, kesin fiyat) yansıt
    TP.degisinceDinle(() => {
      const id = talep.id;
      talep = TP.talepGetir(id) || talep;
      ciz();
      yeniTeklifKontrol();
      if (demo) demo.yenile();
    });
  });
})();
