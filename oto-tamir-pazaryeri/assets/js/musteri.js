// Müşteri paneli: misafir olarak açılan talepler telefon numarasıyla bu panele bağlanır.
// Taleplerim, Garajım, Ödemelerim, Değerlendirmelerim ve Profil / bildirim tercihleri.
(function () {
  const V = window.TP_VERI;
  const { $, $$, esc } = TP;
  const GUN = 864e5;
  const SIMDI = Date.now();

  const GORUNUMLER = {
    talepler: ["Taleplerim", "Açık ve geçmiş hasar talepleri"],
    garaj: ["Garajım", "Kayıtlı araçların"],
    odemeler: ["Ödemelerim", "Güvencedeki ve tamamlanan ödemeler"],
    degerlendirmeler: ["Değerlendirmelerim", "Dükkanlara verdiğin puanlar"],
    profil: ["Profil ve bildirimler", "Hesap, izinler ve bildirim tercihleri"],
  };
  // Geçmişten örnek, tamamlanmış işler
  const GECMIS = [
    { id: "TP-4310", arac: { marka: "Renault", model: "Clio", yil: 2016, paket: "Touch" }, kategoriler: ["boya"], dukkan: "Boyahane Maltepe", tutar: 6800, tarih: SIMDI - 120 * GUN, puan: 5, yorum: "Teklifte yazan fiyata yaptılar, renk tonu birebir tuttu.", garantiAy: 12 },
    { id: "TP-3977", arac: { marka: "Renault", model: "Clio", yil: 2016, paket: "Touch" }, kategoriler: ["elektrik"], dukkan: "Anadolu Oto Elektrik", tutar: 2350, tarih: SIMDI - 300 * GUN, puan: 4, yorum: "Arızayı hızlı buldular, iletişim çok iyiydi.", garantiAy: 6 },
  ];

  const durum = () => TP.durumOku();
  const talepler = () => TP.talepler().slice().reverse();
  function kullanici() {
    const d = durum();
    const son = talepler()[0];
    if (d.uye) return { ad: d.uye.ad, soyad: d.uye.soyad, tel: d.uye.tel, eposta: d.uye.eposta, uye: true };
    if (son) return { ad: son.iletisim.ad, soyad: son.iletisim.soyad, tel: son.iletisim.tel, uye: false };
    return { ad: "Deniz", soyad: "Yılmaz", tel: "5321234567", uye: false, ornek: true };
  }

  // ---------- Görünümler ----------
  function taleplerGorunumu() {
    const k = kullanici();
    const liste = talepler();
    const aktif = liste.filter((t) => !["tamamlandi", "iptal"].includes(t.asama));
    const biten = liste.filter((t) => ["tamamlandi", "iptal"].includes(t.asama));
    const satir = (t) => {
      const q = TP.secilenTeklif(t);
      const n = TP.gorunurTeklifler(t).length;
      const sag = t.asama === "teklif"
        ? `<b>${n} teklif</b>`
        : q ? `<b>${TP.tl(TP.odenecekTutar(t))}</b><span class="soluk">${esc(q.dukkan.ad)}</span>` : "";
      return `<a class="talep-satir" href="talep.html" data-talep="${esc(t.id)}">
        ${TP.plaka(t.id, "kucuk")}
        <div><h3>${esc(TP.aracAdi(t.arac))} · ${t.arac.yil}</h3><p><span>${katAdlari(t.kategoriler)}</span><span>${esc(t.ilce)}, ${esc(t.il)}</span><span>${TP.tarih(t.olusturma)}</span></p></div>
        <div class="sag">${TP.asamaRozet(t.asama)}${sag}</div>
      </a>`;
    };
    return `
      ${k.uye ? "" : `<p class="notice">${TP.ikon("smartphone")}<span>${k.ornek ? "Örnek hesap gösteriliyor. " : ""}Misafir olarak açtığın talepler telefon numaranla (<b class="tnum">${TP.telMaske(k.tel)}</b>) eşleşir. Hesap oluşturursan faturaların ve garanti bilgilerin de burada saklanır.</span><button type="button" class="btn btn-secondary btn-sm" data-hesap>Hesap oluştur</button></p>`}
      <section class="kart">
        <div class="kart-bas"><h2>Açık talepler</h2><a class="btn btn-secondary btn-sm" href="index.html#teklif-al">${TP.ikon("plus")}Yeni talep</a></div>
        ${aktif.length ? aktif.map(satir).join("") : `<div class="kolon-bos">Açık talebin yok. <a href="index.html#teklif-al">Hasarını anlat</a>, dakikalar içinde teklif almaya başla. <a href="talep.html">Örnek talebi incele</a></div>`}
      </section>
      <section class="kart">
        <div class="kart-bas"><h2>Geçmiş</h2></div>
        ${biten.map(satir).join("")}
        ${GECMIS.map((g) => `<div class="talep-satir">${TP.plaka(g.id, "kucuk")}<div><h3>${esc(TP.aracAdi(g.arac))} · ${g.arac.yil}</h3><p><span>${katAdlari(g.kategoriler)}</span><span>${esc(g.dukkan)}</span><span>${TP.tarih(g.tarih, { day: "numeric", month: "long", year: "numeric" })}</span></p></div><div class="sag">${TP.asamaRozet("tamamlandi")}<b>${TP.tl(g.tutar)}</b></div></div>`).join("")}
      </section>`;
  }
  const katAdlari = (ids) => ids.map((k) => V.kategori(k).ad).join(", ");

  function araclar() {
    const harita = new Map();
    for (const t of talepler()) {
      const anahtar = `${t.arac.marka}|${t.arac.model}|${t.arac.yil}`;
      if (!harita.has(anahtar)) harita.set(anahtar, { arac: t.arac, sonIslem: t, adet: 0 });
      harita.get(anahtar).adet++;
    }
    const clio = { arac: GECMIS[0].arac, gecmis: GECMIS[0], adet: GECMIS.length };
    return [...harita.values(), clio];
  }
  function garajGorunumu() {
    return `<div class="arac-kartlari">${araclar().map((a) => {
      const son = a.sonIslem ? `${TP.ASAMA_ETIKET[a.sonIslem.asama][0]} · ${TP.tarih(a.sonIslem.olusturma)}` : `${a.gecmis.dukkan} · ${TP.tarih(a.gecmis.tarih, { month: "short", year: "numeric" })}`;
      const garanti = a.gecmis ? new Date(a.gecmis.tarih + a.gecmis.garantiAy * 30 * GUN) : null;
      return `<article class="arac-kart">
        <span class="arac-ikon">${TP.ikon("car-front")}</span>
        <div><h3>${esc(TP.aracAdi(a.arac))}</h3><p class="soluk">${esc(TP.aracDetay(a.arac))}</p></div>
        <dl>
          <div><dt>Son işlem</dt><dd>${esc(son)}</dd></div>
          <div><dt>Talep sayısı</dt><dd>${a.adet}</dd></div>
          ${garanti ? `<div><dt>İşçilik garantisi</dt><dd>${garanti > SIMDI ? TP.tarih(garanti, { day: "numeric", month: "short", year: "numeric" }) + "'e kadar" : "Sona erdi"}</dd></div>` : ""}
        </dl>
        <button type="button" class="btn btn-primary btn-sm" data-teklif-al='${esc(JSON.stringify(a.arac))}'>${TP.ikon("inbox")}Bu araç için teklif al</button>
      </article>`;
    }).join("")}
      <button type="button" class="arac-kart ekle" data-arac-ekle>${TP.ikon("plus")}<b>Araç ekle</b><span class="soluk">Plaka veya şasi numarasıyla (Faz 2)</span></button></div>`;
  }

  function odemeSatirlari() {
    const canli = talepler().filter((t) => t.odeme).map((t) => {
      const q = TP.secilenTeklif(t);
      return { id: t.id, dukkan: q.dukkan.ad, tutar: t.odeme.tutar + (t.odeme.ekTutar || 0), taksit: t.odeme.taksit, durum: t.odeme.durum, tarih: t.odeme.zaman, fatura: t.tamamlanma && t.tamamlanma.faturaNo };
    });
    const gecmis = GECMIS.map((g) => ({ id: g.id, dukkan: g.dukkan, tutar: g.tutar, taksit: 1, durum: "aktarildi", tarih: g.tarih, fatura: "GIB2025" + g.id.slice(3) + "01" }));
    return [...canli, ...gecmis];
  }
  function odemelerGorunumu() {
    const s = odemeSatirlari();
    const guvende = s.filter((x) => x.durum === "guvende").reduce((a, x) => a + x.tutar, 0);
    const etiket = { guvende: ["Güvende (bloke)", "badge-tq"], aktarildi: ["Dükkana aktarıldı", "badge-success"], iade: ["İade edildi", "badge-danger"] };
    return `
      <p class="notice">${TP.ikon("shield-check")}<span>Ödemen, onarım bitip sen onay verene kadar lisanslı ödeme kuruluşunda bloke tutulur. Şu an güvencede: <b>${TP.tl(guvende)}</b>.</span></p>
      <div class="tablo-kap"><table class="veri-tablo">
        <thead><tr><th>Talep</th><th>Dükkan</th><th class="sag">Tutar</th><th>Ödeme</th><th>Durum</th><th>Tarih</th><th>Fatura</th></tr></thead>
        <tbody>${s.map((x) => `<tr><td>${TP.plaka(x.id, "kucuk")}</td><td>${esc(x.dukkan)}</td><td class="sag"><b>${TP.tl(x.tutar)}</b></td><td class="kucuk-yazi">${x.taksit > 1 ? x.taksit + " taksit" : "Tek çekim"}</td><td><span class="badge badge-dot ${etiket[x.durum][1]}">${etiket[x.durum][0]}</span></td><td class="kucuk-yazi">${TP.tarih(x.tarih, { day: "numeric", month: "short", year: "numeric" })}</td><td class="kucuk-yazi">${x.fatura ? esc(x.fatura) : "Onarım bitince"}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="hint">Kart bilgilerin TamirPort'ta saklanmaz; ödemeler lisanslı ödeme kuruluşu tarafından işlenir. Faturayı onarımı yapan dükkan keser.</p>`;
  }

  function degerlendirmelerGorunumu() {
    const liste = talepler();
    const bekleyen = liste.filter((t) => t.asama === "tamamlandi" && !t.degerlendirme);
    const yapilan = liste.filter((t) => t.degerlendirme).map((t) => ({ dukkan: TP.secilenTeklif(t).dukkan.ad, arac: TP.aracAdi(t.arac), puan: t.degerlendirme.puan, yorum: t.degerlendirme.yorum, tarih: t.degerlendirme.zaman }));
    const hepsi = [...yapilan, ...GECMIS.map((g) => ({ dukkan: g.dukkan, arac: TP.aracAdi(g.arac), puan: g.puan, yorum: g.yorum, tarih: g.tarih }))];
    return `
      ${bekleyen.length ? `<section class="kart"><div class="kart-bas"><h2>Değerlendirme bekleyenler</h2></div>${bekleyen.map((t) => `<div class="aksiyon"><span class="ikon-kutu">${TP.ikon("star")}</span><div><b>${esc(TP.secilenTeklif(t).dukkan.ad)}</b><small>${esc(TP.aracAdi(t.arac))} · 30 gün içinde değerlendirebilirsin</small></div><a class="btn btn-primary btn-sm" href="talep.html" data-talep="${esc(t.id)}">Değerlendir</a></div>`).join("")}</section>` : ""}
      <section class="kart"><div class="kart-bas"><h2>Yaptığın değerlendirmeler</h2></div>
        ${hepsi.map((y) => `<article class="yorum"><header><b>${esc(y.dukkan)}</b>${TP.yildiz(y.puan)}<span class="soluk">${TP.tarih(y.tarih, { day: "numeric", month: "short", year: "numeric" })}</span></header>${y.yorum ? `<p>${esc(y.yorum)}</p>` : ""}<footer><span class="badge badge-success">${TP.ikon("badge-check")}Doğrulanmış iş</span><span class="soluk">${esc(y.arac)}</span></footer></article>`).join("")}
      </section>
      <p class="hint">Yalnızca platformda tamamlanan işler değerlendirilebilir. Yorumlar silinemez; hakaret veya kişisel veri içerenler moderasyonla kaldırılır.</p>`;
  }

  function profilGorunumu() {
    const k = kullanici();
    const d = durum();
    const ticari = d.ticariIleti ?? talepler().some((t) => t.izinler && t.izinler.ticariIleti);
    return `<div class="iki-kolon">
      <section class="kart">
        <div class="kart-bas"><h2>Hesap</h2>${k.uye ? `<span class="badge badge-success">${TP.ikon("user-check")}Üye</span>` : `<span class="badge badge-tq">${TP.ikon("smartphone")}Misafir</span>`}</div>
        <div>
          <div class="ayar-satiri"><div><b>Ad soyad</b><small>${esc(k.ad)} ${esc(k.soyad)}</small></div></div>
          <div class="ayar-satiri"><div><b>Cep telefonu</b><small class="tnum">${TP.telMaske(k.tel)} · SMS koduyla doğrulandı</small></div><span class="badge badge-success">${TP.ikon("circle-check")}Doğrulandı</span></div>
          <div class="ayar-satiri"><div><b>E-posta</b><small>${k.eposta ? esc(k.eposta) : "Eklenmedi · faturalar ve özetler için"}</small></div>${k.eposta ? "" : `<button type="button" class="btn btn-secondary btn-sm" data-hesap>Ekle</button>`}</div>
          <div class="ayar-satiri"><div><b>Giriş yöntemi</b><small>SMS koduyla şifresiz giriş. Şifre belirlemek isteğe bağlı.</small></div><button type="button" class="btn btn-ghost btn-sm" data-bilgi="Şifre belirleme akışı Faz 2'de eklenecek.">Şifre belirle</button></div>
        </div>
        <div class="btn-row"><button type="button" class="btn btn-secondary btn-sm" data-cikis>${TP.ikon("log-out")}Bu cihazda oturumu kapat</button><button type="button" class="btn btn-danger btn-sm" data-hesap-sil>Hesabı ve verileri sil</button></div>
      </section>
      <section class="kart">
        <div class="kart-bas"><h2>Bildirimler</h2></div>
        <div>
          <div class="ayar-satiri"><div><b>İlk teklif ve teklif özeti</b><small>SMS · her teklif için ayrı SMS gönderilmez</small></div><label class="switch"><input type="checkbox" checked><span class="gizli-metin">İlk teklif ve teklif özeti</span></label></div>
          <div class="ayar-satiri"><div><b>Kesin fiyat, onarım ve onay adımları</b><small>SMS · işlem için gerekli</small></div><label class="switch"><input type="checkbox" checked disabled><span class="gizli-metin">İşlem bildirimleri</span></label></div>
          <div class="ayar-satiri"><div><b>Her yeni teklif</b><small>E-posta ve anlık bildirim (üyeler)</small></div><label class="switch"><input type="checkbox" ${k.uye ? "checked" : "disabled"}><span class="gizli-metin">Her yeni teklif</span></label></div>
        </div>
        <div class="kart-bas"><h2>İzinler</h2></div>
        <div>
          <div class="ayar-satiri"><div><b>KVKK açık rızası</b><small>Talep bilgilerinin ve fotoğrafların dükkanlarla paylaşılması · talep açarken verildi</small></div><span class="badge badge-outline">Zorunlu</span></div>
          <div class="ayar-satiri"><div><b>Ticari elektronik ileti</b><small>Kampanya ve bilgilendirme SMS'leri (İYS)</small></div><label class="switch"><input type="checkbox" id="ticari-izin" ${ticari ? "checked" : ""}><span class="gizli-metin">Ticari elektronik ileti</span></label></div>
        </div>
      </section>
    </div>`;
  }

  // ---------- Etkileşimler ----------
  function hesapOlustur() {
    const k = kullanici();
    TP.modal({
      baslik: "Hesabını oluştur", alt: "Telefon numaran zaten doğrulandı. Şifre isteğe bağlı; SMS koduyla girişe devam edebilirsin.",
      icerik: `<div class="field"><label>Telefon</label><input class="input tnum" value="${TP.telMaske(k.tel)}" disabled></div>
        <div class="field" data-alan="eposta"><label for="hs-eposta">E-posta</label><input class="input" id="hs-eposta" type="email" autocomplete="email" placeholder="ornek@eposta.com"><span class="field-error">Geçerli bir e-posta adresi yaz.</span></div>
        <p class="hint">Bu telefonla açtığın tüm talepler hesabına otomatik bağlanır.</p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Hesabı oluştur", sinif: "btn-primary", eylem: (d) => {
        const ep = d.querySelector("#hs-eposta");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ep.value.trim())) { ep.closest(".field").classList.add("has-error"); ep.focus(); return false; }
        const s = durum();
        s.uye = { eposta: ep.value.trim(), zaman: Date.now(), tel: k.tel, ad: k.ad, soyad: k.soyad };
        s.oturumTel = k.tel;
        TP.durumYaz(s);
        ciz();
        TP.toast("Hesabın oluşturuldu.", { tur: "basari" });
        return undefined;
      } }],
    });
  }
  function aktifGorunum() { const h = location.hash.replace("#", ""); return GORUNUMLER[h] ? h : "talepler"; }
  function ciz() {
    const g = aktifGorunum();
    const k = kullanici();
    $("#gorunum-baslik").textContent = GORUNUMLER[g][0];
    $("#gorunum-alt").textContent = GORUNUMLER[g][1];
    $$("[data-gorunum]").forEach((a) => { if (a.dataset.gorunum === g) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    $("#gorunum").innerHTML = { talepler: taleplerGorunumu, garaj: garajGorunumu, odemeler: odemelerGorunumu, degerlendirmeler: degerlendirmelerGorunumu, profil: profilGorunumu }[g]();
    $('[data-sayac="talepler"]').textContent = talepler().filter((t) => !["tamamlandi", "iptal"].includes(t.asama)).length || "";
    $("#yan-kullanici").innerHTML = `<div class="profil-ust"><span class="shop-logo kucuk" data-ton="1">${esc((k.ad[0] || "") + (k.soyad[0] || ""))}</span><div><h3>${esc(k.ad)} ${esc(k.soyad)}</h3><p class="tnum">${TP.telMaske(k.tel)}</p></div></div><span><span class="badge ${k.uye ? "badge-success" : "badge-tq"}">${k.uye ? "Üye" : "Misafir · telefonla doğrulandı"}</span></span>`;
  }

  TP.sayfaKur(() => {
    ciz();
    document.addEventListener("click", (e) => {
      const b = (s) => e.target.closest(s);
      let el;
      if ((el = b("[data-talep]"))) { const s = durum(); s.aktifTalepId = el.dataset.talep; TP.durumYaz(s); }
      if (b("[data-hesap]")) hesapOlustur();
      if ((el = b("[data-teklif-al]"))) {
        const s = durum(); s.onDoldur = JSON.parse(el.dataset.teklifAl); TP.durumYaz(s);
        location.href = "index.html#teklif-al";
      }
      if (b("[data-arac-ekle]")) TP.toast("Plaka ya da şasi numarasıyla araç ekleme Faz 2'de geliyor.");
      if ((el = b("[data-bilgi]"))) TP.toast(esc(el.dataset.bilgi));
      if (b("[data-cikis]")) { const s = durum(); s.oturumTel = null; TP.durumYaz(s); TP.toast("Bu cihazdaki oturum kapatıldı. Tekrar girmek için SMS kodu istenir."); }
      if (b("[data-hesap-sil]")) {
        TP.modal({
          baslik: "Hesabı ve verileri sil",
          icerik: `<p>Açık talebin ya da güvencede bekleyen ödemen varsa, önce bunların tamamlanması gerekir. Silme talebin KVKK kapsamında 30 gün içinde sonuçlandırılır; fatura kayıtları yasal süre boyunca saklanır.</p>`,
          butonlar: [{ metin: "Vazgeç" }, { metin: "Silme talebi oluştur", sinif: "btn-danger", eylem: () => TP.toast("Silme talebin alındı. Prototipte veri silinmez.") }],
        });
      }
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "ticari-izin") {
        const s = durum(); s.ticariIleti = e.target.checked; TP.durumYaz(s);
        TP.toast(e.target.checked ? "Ticari ileti izni verildi." : "Ticari ileti izni geri alındı.");
      }
    });
    addEventListener("hashchange", () => { ciz(); window.scrollTo(0, 0); });
    TP.degisinceDinle(ciz);
    TP.demoPanel((panel) => {
      panel.innerHTML = `<h2>Prototip kontrolleri</h2><p>Bu panel, ana sayfada oluşturduğun talepleri telefon numaran üzerinden gösterir.</p>
        <div class="demo-group"><span>Ekranlar</span><div class="demo-buttons"><button type="button" data-demo="form">Yeni talep oluştur</button><button type="button" data-demo="talep">Teklif takip</button></div></div>
        <div class="demo-group"><span>Demo verisi</span><div class="demo-buttons"><button type="button" data-demo="sifirla">Tüm demo verisini sil</button></div></div>`;
      panel.onclick = (e) => {
        const b = e.target.closest("[data-demo]");
        if (!b) return;
        if (b.dataset.demo === "form") location.href = "index.html#teklif-al";
        if (b.dataset.demo === "talep") location.href = "talep.html";
        if (b.dataset.demo === "sifirla") { TP.sifirla(); location.reload(); }
      };
    });
  });
})();
