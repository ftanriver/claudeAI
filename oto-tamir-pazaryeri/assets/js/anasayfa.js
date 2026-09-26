// Ana sayfa: hasar tespit sihirbazı + SMS kodu, Tekliflerim girişi, firma listesi, puan tablosu,
// markalar, rehber ve aktif talep bandı.
(function () {
  const V = window.TP_VERI;
  const { $, $$, esc } = TP;

  const ORNEK_KISA_LINK = "tamirport.com/t/";
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  const telRakam = (v) => v.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
  const telYaz = (d) => [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(" ");
  const telGecerli = (d) => /^5\d{9}$/.test(d);
  const secenekler = (dizi, bosMetin) => (bosMetin ? `<option value="">${bosMetin}</option>` : "") + dizi.map((x) => `<option>${esc(x)}</option>`).join("");

  // SMS kodu akışı (sihirbaz ve Tekliflerim ortak kullanır). Kural: 6 hane, 3 dk geçerli,
  // 60 sn sonra yeniden gönderim, 5 hatalı denemede kilit.
  function otpAkisi({ kutular, hata, sure, tekrar, basarili }) {
    let kod = null, bitis = 0, tekrarAn = 0, deneme = 0, sayac = null, tamam = false;
    const giris = TP.otpKur(kutular, { tamamlaninca: () => dogrula() });
    const goster = (m) => { hata.innerHTML = m; hata.hidden = !m; kutular.classList.toggle("has-error", !!m); };
    const tik = () => {
      if (sure) sure.textContent = bitis > Date.now() ? `Kod ${mmss(bitis - Date.now())} geçerli` : "Kodun süresi doldu";
      if (tekrar) {
        const kalan = tekrarAn - Date.now();
        tekrar.disabled = kalan > 0;
        tekrar.textContent = kalan > 0 ? `Tekrar gönder (${Math.ceil(kalan / 1000)} sn)` : "Tekrar gönder";
      }
    };
    function gonder() {
      kod = TP.otpUret(); bitis = Date.now() + 180e3; tekrarAn = Date.now() + 60e3; deneme = 0; tamam = false;
      goster(""); giris.temizle();
      TP.sms(`TamirPort doğrulama kodun: <b class="tnum">${kod}</b>. Kod 3 dakika geçerli, kimseyle paylaşma.`, { eylemMetni: "Kodu doldur", eylem: () => giris.doldur(kod) });
      clearInterval(sayac); sayac = setInterval(tik, 1000); tik();
    }
    function dogrula() {
      if (tamam) return;
      const g = giris.deger();
      if (deneme >= 5) return goster("Çok fazla hatalı deneme yaptın. 15 dakika sonra yeniden dene.");
      if (g.length < 6) return goster("6 haneli kodun tamamını gir.");
      if (Date.now() > bitis) return goster("Kodun süresi doldu. Yeni kod iste.");
      if (g !== kod) {
        deneme++;
        return goster(deneme >= 5 ? "Çok fazla hatalı deneme yaptın. 15 dakika sonra yeniden dene." : `Kod hatalı. ${5 - deneme} deneme hakkın kaldı.`);
      }
      tamam = true; clearInterval(sayac); goster(""); TP.$(".sms")?.remove();
      basarili();
    }
    tekrar && tekrar.addEventListener("click", gonder);
    return { gonder, dogrula, durdur: () => clearInterval(sayac) };
  }

  // ---------- Hasar tespit sihirbazı ----------
  const secili = new Set();
  let fotolar = [];
  let adim = "1";
  let otp;

  function sihirbazKur() {
    const marka = $("#f-marka"), model = $("#f-model"), paket = $("#f-paket"), yil = $("#f-yil"), il = $("#f-il"), ilce = $("#f-ilce");
    marka.innerHTML = secenekler(V.markalar.map((m) => m.ad), "Marka seç");
    const yillar = [];
    for (let y = new Date().getFullYear(); y >= 1995; y--) yillar.push(y);
    yil.innerHTML = secenekler(yillar, "Yıl seç");
    const digerIller = V.iller.filter((x) => !V.populerIller.includes(x));
    il.innerHTML = `<option value="">İl seç</option><optgroup label="Sık seçilenler">${secenekler(V.populerIller)}</optgroup><optgroup label="Tüm iller">${secenekler(digerIller)}</optgroup>`;

    marka.addEventListener("change", () => markaDegisti());
    il.addEventListener("change", () => {
      ilce.innerHTML = il.value ? secenekler(V.ilceleriGetir(il.value), "İlçe seç") : `<option value="">Önce il seç</option>`;
      ilce.disabled = !il.value;
    });

    $("#f-kategoriler").innerHTML = V.kategoriler.map((k) => `
      <button type="button" class="cat-option" aria-pressed="false" data-kategori="${k.id}">
        ${TP.ikon(k.ikon)}<b>${k.ad}</b><small>${k.ozet}</small><span class="tik">${TP.ikon("check")}</span>
      </button>`).join("");
    $("#f-kategoriler").addEventListener("click", (e) => {
      const b = e.target.closest("[data-kategori]");
      if (b) kategoriSec(b.dataset.kategori, !secili.has(b.dataset.kategori));
    });

    const dosya = $("#f-foto"), dz = $("#f-dropzone");
    dosya.addEventListener("change", () => { fotoEkle(dosya.files); dosya.value = ""; });
    ["dragenter", "dragover"].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add("suruklendi"); }));
    ["dragleave", "drop"].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove("suruklendi"); }));
    dz.addEventListener("drop", (e) => fotoEkle(e.dataTransfer.files));
    $("#f-foto-liste").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sil]");
      if (!b) return;
      fotolar.splice(Number(b.dataset.sil), 1);
      fotolariCiz();
    });

    const aciklama = $("#f-aciklama");
    aciklama.addEventListener("input", () => { $("#f-aciklama-say").textContent = aciklama.value.length; });

    const tel = $("#f-tel");
    tel.addEventListener("input", () => { tel.value = telYaz(telRakam(tel.value)); });

    // Hata mesajı, alan düzeltilince kalkar
    $("#sihirbaz").addEventListener("input", (e) => e.target.closest(".field, .check")?.classList.remove("has-error"));
    $("#sihirbaz").addEventListener("change", (e) => e.target.closest(".field, .check")?.classList.remove("has-error"));

    $("#hasar-formu").addEventListener("click", (e) => {
      if (e.target.closest("[data-ileri]")) { if (adimGecerli(adim)) adimGit(String(Number(adim) + 1)); }
      if (e.target.closest("[data-geri]")) adimGit(String(Number(adim) - 1));
    });
    $("#hasar-formu").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!adimGecerli("3")) return;
      adimGit("otp");
      $("#otp-tel").textContent = TP.telMaske(telRakam(tel.value));
      otp.gonder();
    });

    otp = otpAkisi({ kutular: $("#otp-kutular"), hata: $("#otp-hata"), sure: $("#otp-sure"), tekrar: $("#otp-tekrar"), basarili: talepOlustur });
    $("#otp-dogrula").addEventListener("click", () => otp.dogrula());
    $("[data-duzenle]").addEventListener("click", () => { otp.durdur(); adimGit("3"); $("#f-tel").focus(); });
    $("#bitti-kopyala").addEventListener("click", () => {
      const t = TP.aktifTalep();
      TP.kopyala(ORNEK_KISA_LINK + (t ? t.id.replace("TP-", "") : ""), "Takip linki kopyalandı (prototipte örnek bağlantı).");
    });
  }

  function markaDegisti(onceki = {}) {
    const m = V.marka($("#f-marka").value);
    const model = $("#f-model"), paket = $("#f-paket");
    model.innerHTML = m ? secenekler(m.modeller, "Model seç") : `<option value="">Önce marka seç</option>`;
    paket.innerHTML = m ? secenekler([...m.paketler, V.PAKET_BILMIYORUM], "Paket seç") : `<option value="">Önce marka seç</option>`;
    model.disabled = paket.disabled = !m;
    if (onceki.model) model.value = onceki.model;
    if (onceki.paket) paket.value = onceki.paket;
  }

  function kategoriSec(id, secilsin) {
    if (secilsin) secili.add(id); else secili.delete(id);
    $$(".cat-option").forEach((b) => b.setAttribute("aria-pressed", String(secili.has(b.dataset.kategori))));
    $('[data-alan="kategori"]').classList.remove("has-error");
  }

  async function fotoEkle(liste) {
    const dosyalar = Array.from(liste || []).filter((f) => f.type.startsWith("image/"));
    const yer = 6 - fotolar.length;
    if (dosyalar.length > yer) TP.toast(`En fazla 6 fotoğraf ekleyebilirsin. İlk ${Math.max(0, yer)} fotoğraf eklendi.`, { tur: "uyari" });
    for (const f of dosyalar.slice(0, Math.max(0, yer))) {
      try { fotolar.push(await TP.fotoKucult(f)); } catch (e) { TP.toast(`${esc(f.name)} okunamadı.`, { tur: "uyari" }); }
    }
    fotolariCiz();
  }
  function fotolariCiz() {
    $("#f-foto-liste").innerHTML = fotolar.map((src, i) => `<li><img src="${src}" alt="Hasar fotoğrafı ${i + 1}"><button type="button" data-sil="${i}" aria-label="${i + 1}. fotoğrafı kaldır">${TP.ikon("x")}</button></li>`).join("");
  }

  function hataGoster(alan) { $(`[data-alan="${alan}"]`).classList.add("has-error"); }
  function adimGecerli(n) {
    const hatalar = [];
    if (n === "1") {
      ["marka", "model", "yil", "paket"].forEach((a) => { if (!$(`#f-${a}`).value) hatalar.push(a); });
    } else if (n === "2") {
      if (!secili.size) hatalar.push("kategori");
    } else if (n === "3") {
      if ($("#f-ad").value.trim().length < 2) hatalar.push("ad");
      if ($("#f-soyad").value.trim().length < 2) hatalar.push("soyad");
      if (!telGecerli(telRakam($("#f-tel").value))) hatalar.push("tel");
      if (!$("#f-il").value) hatalar.push("il");
      if (!$("#f-ilce").value) hatalar.push("ilce");
      if (!$("#f-kvkk").checked) hatalar.push("kvkk");
    }
    hatalar.forEach(hataGoster);
    if (hatalar.length) {
      const ilk = $(`[data-alan="${hatalar[0]}"]`);
      (ilk.querySelector("input, select, button, textarea") || ilk).focus();
    }
    return !hatalar.length;
  }

  function adimGit(hedef) {
    adim = hedef;
    $$("#sihirbaz .wz-panel").forEach((p) => { p.hidden = p.dataset.adim !== hedef; });
    const no = Number(hedef);
    $("#wz-adimlar").classList.toggle("gizli", !no);
    $$("#wz-adimlar li").forEach((li) => {
      const g = Number(li.dataset.gosterge);
      li.classList.toggle("aktif", g === no);
      li.classList.toggle("tamam", g < no);
    });
    const kutu = $("#sihirbaz").getBoundingClientRect();
    if (kutu.top < 70) $("#sihirbaz").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function talepOlustur() {
    const tel = telRakam($("#f-tel").value);
    const talep = {
      id: TP.yeniTalepNo(),
      olusturma: Date.now(),
      arac: { marka: $("#f-marka").value, model: $("#f-model").value, yil: Number($("#f-yil").value), paket: $("#f-paket").value },
      kategoriler: V.kategoriler.map((k) => k.id).filter((id) => secili.has(id)),
      aciklama: $("#f-aciklama").value.trim(),
      fotolar: fotolar.slice(),
      yuruyor: !$("#f-yurumuyor").checked,
      il: $("#f-il").value,
      ilce: $("#f-ilce").value,
      iletisim: { ad: $("#f-ad").value.trim(), soyad: $("#f-soyad").value.trim(), tel },
      izinler: { kvkk: true, ticariIleti: $("#f-iys").checked },
      asama: "teklif",
      olaylar: [{ zaman: Date.now(), metin: "Talep oluşturuldu ve telefon SMS koduyla doğrulandı.", kim: "musteri" }],
    };
    talep.teklifler = V.teklifleriUret(talep);
    talep.iletilen = V.iletilenDukkanSayisi(talep);
    TP.talepKaydet(talep, true);
    TP.oturumAc(tel);

    $("#bitti-plaka").innerHTML = TP.plaka(talep.id, "buyuk");
    $("#bitti-metin").innerHTML = `${esc(TP.aracAdi(talep.arac))} için talebin, kategori ve konumuna uyan <b>${talep.iletilen} dükkana</b> iletildi. Teklifler geldikçe SMS ile haber vereceğiz.`;
    adimGit("bitti");
    aktifTalepBandi();
    setTimeout(() => TP.sms(`${esc(talep.id)} numaralı talebin ${talep.iletilen} dükkana iletildi. Teklifleri buradan takip et: <b>${ORNEK_KISA_LINK}${talep.id.replace("TP-", "")}</b>`, { eylemMetni: "Teklifleri aç", eylem: () => { location.href = "talep.html"; } }), 900);
  }

  // Marka, kategori veya prototip kontrolünden formu önceden doldurma
  function markaSec(ad) {
    if (["otp", "bitti"].includes(adim)) adimGit("1");
    $("#f-marka").value = ad;
    markaDegisti();
    $('[data-alan="marka"]').classList.remove("has-error");
    if (adim !== "1") adimGit("1");
    $("#teklif-al").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => $("#f-model").focus({ preventScroll: true }), 500);
    TP.toast(`${esc(ad)} seçildi. Modeli ve yılı seçerek devam et.`);
  }
  function ornekleDoldur() {
    if (adim === "bitti" || adim === "otp") adimGit("1");
    $("#f-marka").value = "BMW";
    markaDegisti({ model: "3 Serisi", paket: "M Sport" });
    $("#f-yil").value = "2019";
    secili.clear(); kategoriSec("kaporta", true); kategoriSec("boya", true);
    $("#f-aciklama").value = "Park halindeyken sağ ön çamurluğa sürtme oldu. Çamurlukta göçük ve boya kalkması var, far çerçevesi çizik. Araç yürür durumda.";
    $("#f-aciklama-say").textContent = $("#f-aciklama").value.length;
    $("#f-ad").value = "Deniz"; $("#f-soyad").value = "Yılmaz"; $("#f-tel").value = "532 123 45 67";
    $("#f-il").value = "İstanbul"; $("#f-il").dispatchEvent(new Event("change"));
    $("#f-ilce").value = "Kadıköy"; $("#f-kvkk").checked = true;
    $$("#sihirbaz .has-error").forEach((el) => el.classList.remove("has-error"));
    adimGit("3");
    $("#teklif-al").scrollIntoView({ behavior: "smooth" });
    TP.toast("Form örnek verilerle dolduruldu. Kod gönder'e basarak devam et.", { tur: "basari" });
  }

  // ---------- Aktif talep bandı ----------
  function aktifTalepBandi() {
    const yer = $("#aktif-talep");
    const t = TP.aktifTalep();
    let kapali = false;
    try { kapali = sessionStorage.getItem("tp-bant-kapali") === (t && t.id); } catch (e) { /* yok say */ }
    if (!t || kapali || ["iptal", "tamamlandi"].includes(t.asama)) { yer.hidden = true; return; }
    const n = TP.gorunurTeklifler(t).length;
    const mesaj = t.asama === "teklif"
      ? (n ? `Talebin için <b>${n} teklif</b> geldi · ${esc(TP.aracAdi(t.arac))}` : `Talebin dükkanlara iletildi, <b>teklifler bekleniyor</b> · ${esc(TP.aracAdi(t.arac))}`)
      : `Talebin: <b>${TP.ASAMA_ETIKET[t.asama][0]}</b> · ${esc(TP.aracAdi(t.arac))}`;
    yer.innerHTML = `<div class="wrap">${TP.plaka(t.id, "kucuk")}<p>${mesaj}</p>
      <a class="btn btn-sm" href="talep.html">${t.asama === "teklif" ? "Teklifleri gör" : "Talebe git"}${TP.ikon("arrow-right")}</a>
      <button type="button" class="icon-btn" aria-label="Bandı gizle" data-bant-kapat>${TP.ikon("x")}</button></div>`;
    yer.hidden = false;
    yer.querySelector("[data-bant-kapat]").addEventListener("click", () => {
      yer.hidden = true;
      try { sessionStorage.setItem("tp-bant-kapali", t.id); } catch (e) { /* yok say */ }
    });
  }

  // ---------- Tekliflerim (misafir girişi) ----------
  let takipOtp, takipTel = "";
  function takipKur() {
    const modal = $("#takip-modal");
    const goster = (ad) => $$(".takip-adim", modal).forEach((a) => { a.hidden = a.dataset.takip !== ad; });
    $$("[data-takip-ac]").forEach((b) => b.addEventListener("click", () => {
      const d = TP.durumOku();
      if (d.oturumTel) { listeCiz(d.oturumTel, true); goster("liste"); } else { goster("tel"); }
      TP.modalAc(modal);
      if (!d.oturumTel) setTimeout(() => $("#takip-tel").focus(), 50);
    }));
    $("#takip-tel").addEventListener("input", (e) => { e.target.value = telYaz(telRakam(e.target.value)); e.target.closest(".field").classList.remove("has-error"); });
    $("#takip-tel-form").addEventListener("submit", (e) => {
      e.preventDefault();
      takipTel = telRakam($("#takip-tel").value);
      if (!telGecerli(takipTel)) { hataGoster("takip-tel"); return; }
      $("#takip-otp-tel").textContent = TP.telMaske(takipTel);
      goster("otp");
      takipOtp.gonder();
    });
    takipOtp = otpAkisi({
      kutular: $("#takip-kutular"), hata: $("#takip-hata"),
      basarili: () => { TP.oturumAc(takipTel); listeCiz(takipTel, false); goster("liste"); },
    });
    $("#takip-dogrula").addEventListener("click", () => takipOtp.dogrula());
    modal.addEventListener("close", () => takipOtp.durdur());
    $("#takip-liste").addEventListener("click", (e) => {
      const a = e.target.closest("[data-talep]");
      if (a) { const d = TP.durumOku(); d.aktifTalepId = a.dataset.talep; TP.durumYaz(d); }
      if (e.target.closest("[data-cikis]")) {
        const d = TP.durumOku(); d.oturumTel = null; TP.durumYaz(d);
        goster("tel");
        TP.toast("Bu cihazdaki oturum kapatıldı.");
      }
    });
  }
  function listeCiz(tel, oturumdan) {
    const talepler = TP.talepler().filter((t) => t.iletisim && t.iletisim.tel === tel).reverse();
    const ust = `<p class="notice success">${TP.ikon("user-check")}<span>${oturumdan ? "Bu cihazda oturumun açık" : "Giriş yapıldı"}: <b class="tnum">${TP.telMaske(tel)}</b>. Bu numarayla açılan talepler:</span></p>`;
    const liste = talepler.length ? talepler.map((t) => `
      <a class="takip-talep" href="talep.html" data-talep="${esc(t.id)}">${TP.plaka(t.id, "kucuk")}
        <span><b>${esc(TP.aracAdi(t.arac))}</b><small>${TP.tarih(t.olusturma)} · ${t.asama === "teklif" ? TP.gorunurTeklifler(t).length + " teklif" : TP.ASAMA_ETIKET[t.asama][0]}</small></span>
        ${TP.ikon("chevron-right")}</a>`).join("")
      : `<div class="notice">${TP.ikon("info")}<span>Bu numarayla açılmış bir talep bulunamadı. Yeni talep oluşturabilir ya da <a href="talep.html">örnek talebi inceleyebilirsin</a>.</span></div>`;
    $("#takip-liste").innerHTML = ust + liste + `
      <a class="btn btn-secondary btn-block" href="musteri-paneli.html">${TP.ikon("layout-dashboard")}Müşteri paneline git</a>
      <button type="button" class="btn btn-ghost btn-block" data-cikis>Bu cihazda oturumu kapat</button>`;
  }

  // ---------- Anlaşmalı firmalar ----------
  let firmaKategori = "";
  function firmalariCiz() {
    const filtre = $("#firma-filtre");
    filtre.innerHTML = [["", "Tümü"], ...V.kategoriler.map((k) => [k.id, k.ad])]
      .map(([id, ad]) => `<button type="button" class="chip" aria-pressed="${id === firmaKategori}" data-firma-kat="${id}">${ad}</button>`).join("");
    const liste = V.dukkanlar.filter((d) => d.anlasmali && (!firmaKategori || d.kategoriler.includes(firmaKategori)))
      .sort((a, b) => b.puan - a.puan || b.degerlendirme - a.degerlendirme).slice(0, 8);
    $("#firma-listesi").innerHTML = liste.map((d) => `
      <article class="partner">
        <div class="partner-top">${TP.dukkanLogo(d)}<div><h3>${esc(d.ad)}</h3><p>${TP.ikon("map-pin")}${esc(d.ilce)}, ${esc(d.il)}</p></div></div>
        <div class="partner-badges"><span class="badge badge-tq">${TP.ikon("badge-check")}Anlaşmalı</span><span class="badge badge-outline">${TP.ikon("shield")}${d.garantiAy} ay garanti</span></div>
        ${TP.puanRozet(d.puan, d.degerlendirme)}
        ${TP.katEtiketleri(d.kategoriler)}
        <dl class="partner-stats"><div><dt>Tamamlanan iş</dt><dd>${TP.sayi(d.tamamlanan)}</dd></div><div><dt>Teklife sadakat</dt><dd>%${d.sadakat}</dd></div></dl>
        <button type="button" class="btn btn-secondary btn-sm btn-block" data-profil="${d.id}">Profili gör</button>
      </article>`).join("") || `<p class="bos-sonuc">Bu kategoride henüz anlaşmalı firma yok.</p>`;
  }
  function profilAc(d) {
    TP.modal({
      baslik: esc(d.ad),
      alt: `${TP.ikon("map-pin")} ${esc(d.ilce)}, ${esc(d.il)} · ${d.kurulus}'dan beri`,
      icerik: `
        <div class="partner-badges">${d.anlasmali ? `<span class="badge badge-tq">${TP.ikon("badge-check")}Anlaşmalı firma</span>` : ""}<span class="badge badge-outline">${TP.ikon("shield")}${d.garantiAy} ay işçilik garantisi</span><span class="badge badge-outline">${TP.ikon("clock")}Ort. yanıt ${d.yanitDk} dk</span></div>
        <dl class="istatlar">
          <div class="istat"><dt>Puan</dt><dd>${TP.puan(d.puan)}</dd></div>
          <div class="istat"><dt>Değerlendirme</dt><dd>${TP.sayi(d.degerlendirme)}</dd></div>
          <div class="istat"><dt>Tamamlanan iş</dt><dd>${TP.sayi(d.tamamlanan)}</dd></div>
          <div class="istat"><dt>Teklife sadakat</dt><dd>%${d.sadakat}</dd></div>
        </dl>
        <div><p class="alt-baslik">Uzmanlık</p>${TP.katEtiketleri(d.kategoriler)}</div>
        <div><p class="alt-baslik">Değerlendirme kriterleri</p>${TP.kriterCubuklari(d.kriterler)}</div>
        <div><p class="alt-baslik">Son değerlendirmeler</p>${TP.yorumlarHTML(2, Number(d.id.slice(1)) % 4)}</div>
        <p class="notice">${TP.ikon("lock")}<span>Adres ve telefon, bu dükkanın teklifini seçtiğinde paylaşılır.</span></p>`,
      butonlar: [
        { metin: "Kapat" },
        { metin: "Teklif al", sinif: "btn-primary", eylem: () => { $("#teklif-al").scrollIntoView({ behavior: "smooth" }); } },
      ],
    });
  }

  // ---------- Puan tablosu ----------
  const tablo = { il: "İstanbul", kategori: "", alan: "puan" };
  function tabloCiz() {
    $("#puan-kategori").innerHTML = [["", "Tümü"], ...V.kategoriler.map((k) => [k.id, k.ad])]
      .map(([id, ad]) => `<button type="button" aria-pressed="${id === tablo.kategori}" data-tablo-kat="${id}">${ad}</button>`).join("");
    $$(".rank-table th").forEach((th) => {
      const b = th.querySelector("[data-sirala]");
      if (b) { if (b.dataset.sirala === tablo.alan) th.setAttribute("aria-sort", tablo.alan === "yanitDk" ? "ascending" : "descending"); else th.removeAttribute("aria-sort"); }
    });
    const artan = tablo.alan === "yanitDk";
    const liste = V.dukkanlar
      .filter((d) => (!tablo.il || d.il === tablo.il) && (!tablo.kategori || d.kategoriler.includes(tablo.kategori)) && d.degerlendirme >= 5)
      .sort((a, b) => (artan ? a[tablo.alan] - b[tablo.alan] : b[tablo.alan] - a[tablo.alan]) || b.puan - a.puan)
      .slice(0, 10);
    $("#puan-tablosu").innerHTML = liste.map((d, i) => `
      <tr>
        <td class="t-sira"><span class="sira">${i + 1}</span></td>
        <td class="t-firma"><div class="firma-hucre">${TP.dukkanLogo(d, "kucuk")}<div><b>${esc(d.ad)}</b><small>${esc(d.ilce)}, ${esc(d.il)}</small></div></div></td>
        <td class="t-kat">${TP.katEtiketleri(d.kategoriler)}</td>
        <td class="t-puan">${TP.puanRozet(d.puan)}</td>
        <td class="t-metrik t-ilk" data-etiket="Değerlendirme">${TP.sayi(d.degerlendirme)}</td>
        <td class="t-metrik" data-etiket="Tamamlanan">${TP.sayi(d.tamamlanan)}</td>
        <td class="t-metrik" data-etiket="Sadakat">%${d.sadakat}</td>
        <td class="t-metrik" data-etiket="Yanıt">${d.yanitDk} dk</td>
      </tr>`).join("") || `<tr><td colspan="8" class="soluk">Bu filtrelerle eşleşen dükkan yok.</td></tr>`;
  }

  // ---------- Markalar, rehber, footer ----------
  function markalariCiz() {
    $("#marka-listesi").innerHTML = V.markalar.map((m) => `<li><button type="button" class="brand-tile" data-marka="${esc(m.ad)}" aria-label="${esc(m.ad)} için teklif al"><span lang="en">${esc(m.ad)}</span></button></li>`).join("");
  }
  function makaleleriCiz() {
    $("#makale-listesi").innerHTML = V.makaleler.map((m) => `
      <article class="article">
        <span class="article-art" data-desen="${m.desen}" aria-hidden="true">${TP.ikon(m.ikon)}</span>
        <div class="article-body">
          <span><span class="badge badge-tq">${m.etiket}</span></span>
          <h3>${esc(m.baslik)}</h3>
          <p>${esc(m.ozet)}</p>
          <div class="article-meta"><span>${m.sure} dk okuma</span><button type="button" class="oku link-btn stretched" data-makale="${m.id}">Oku${TP.ikon("arrow-right")}</button></div>
        </div>
      </article>`).join("");
  }
  function makaleAc(id) {
    const m = V.makaleler.find((x) => x.id === id);
    TP.modal({ baslik: esc(m.baslik), alt: `${m.etiket} · ${m.sure} dk okuma`, icerik: `<div class="makale-icerik">${m.icerik}</div>`, butonlar: [{ metin: "Teklif al", sinif: "btn-primary", eylem: () => $("#teklif-al").scrollIntoView({ behavior: "smooth" }) }] });
  }

  function mobilCta() {
    const cta = $("#mobil-cta");
    if (!("IntersectionObserver" in window)) return;
    let formGorunur = true, heroGorunur = true;
    const guncelle = () => { cta.hidden = formGorunur || heroGorunur; };
    new IntersectionObserver((g) => { formGorunur = g[0].isIntersecting; guncelle(); }).observe($("#sihirbaz"));
    new IntersectionObserver((g) => { heroGorunur = g[0].isIntersecting; guncelle(); }, { rootMargin: "0px 0px -60% 0px" }).observe($(".hero-copy"));
  }

  function demoCiz(panel) {
    panel.innerHTML = `<h2>Prototip kontrolleri</h2>
      <p>Akışı hızlıca denemek için. Girdiğin bilgiler yalnızca bu tarayıcıda tutulur.</p>
      <div class="demo-group"><span>Form</span><div class="demo-buttons"><button type="button" data-demo="doldur">Örnek verilerle doldur</button></div></div>
      <div class="demo-group"><span>Ekranlar</span><div class="demo-buttons"><button type="button" data-demo="takip">Teklif takip</button><button type="button" data-demo="dukkan">Dükkan paneli</button><button type="button" data-demo="akis">Akış ve kurallar</button></div></div>
      <div class="demo-group"><span>Demo verisi</span><div class="demo-buttons"><button type="button" data-demo="sifirla">Tüm demo verisini sil</button></div></div>`;
    panel.onclick = (e) => {
      const b = e.target.closest("[data-demo]");
      if (!b) return;
      const eylem = b.dataset.demo;
      if (eylem === "doldur") { demo.kapat(); ornekleDoldur(); }
      if (eylem === "takip") location.href = "talep.html";
      if (eylem === "dukkan") location.href = "dukkan-paneli.html";
      if (eylem === "akis") location.href = "akis.html";
      if (eylem === "sifirla") { TP.sifirla(); try { sessionStorage.clear(); } catch (err) { /* yok say */ } location.reload(); }
    };
  }
  let demo;

  // Müşteri panelindeki "Bu araç için teklif al" formu araç bilgileriyle açar
  function onDoldur() {
    const d = TP.durumOku();
    if (!d.onDoldur) return;
    const a = d.onDoldur;
    delete d.onDoldur;
    TP.durumYaz(d);
    if (!V.marka(a.marka)) return;
    $("#f-marka").value = a.marka;
    markaDegisti({ model: a.model, paket: a.paket });
    $("#f-yil").value = String(a.yil);
    TP.toast(`${esc(a.marka)} ${esc(a.model)} bilgileri dolduruldu. Devam ederek hasarı anlat.`, { tur: "basari" });
  }

  TP.sayfaKur(() => {
    sihirbazKur();
    onDoldur();
    takipKur();
    firmalariCiz();
    tabloCiz();
    markalariCiz();
    makaleleriCiz();
    aktifTalepBandi();
    mobilCta();
    demo = TP.demoPanel(demoCiz);
    $("#footer-kategoriler").innerHTML = V.kategoriler.map((k) => `<li><a href="#teklif-al" data-kategori-sec="${k.id}">${k.ad}</a></li>`).join("");

    document.addEventListener("click", (e) => {
      const t = e.target;
      const firmaKat = t.closest("[data-firma-kat]");
      if (firmaKat) { firmaKategori = firmaKat.dataset.firmaKat; firmalariCiz(); }
      const profil = t.closest("[data-profil]");
      if (profil) profilAc(V.dukkan(profil.dataset.profil));
      const tabloKat = t.closest("[data-tablo-kat]");
      if (tabloKat) { tablo.kategori = tabloKat.dataset.tabloKat; tabloCiz(); }
      const sirala = t.closest("[data-sirala]");
      if (sirala) { tablo.alan = sirala.dataset.sirala; tabloCiz(); }
      const marka = t.closest("[data-marka]");
      if (marka) markaSec(marka.dataset.marka);
      const makale = t.closest("[data-makale]");
      if (makale) makaleAc(makale.dataset.makale);
      const kat = t.closest("[data-kategori-sec]");
      if (kat) {
        kategoriSec(kat.dataset.kategoriSec, true);
        TP.toast(`${V.kategori(kat.dataset.kategoriSec).ad} kategorisi seçildi.`);
      }
      if (t.closest("[data-kvkk]")) TP.modalAc("kvkk-modal");
    });
    $("#puan-il").addEventListener("change", (e) => { tablo.il = e.target.value; tabloCiz(); });
    TP.degisinceDinle(aktifTalepBandi);
  });
})();
