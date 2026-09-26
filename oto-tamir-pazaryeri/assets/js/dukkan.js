// Dükkan paneli: kategoriye ve bölgeye göre filtrelenen talepler, teklif verme (komisyon ve net hakediş
// hesabıyla), kodla teslim alma, kesin fiyat/revize, onarımı tamamlama, hakedişler, değerlendirmeler, profil.
// Demo talepleri (ana sayfadan oluşturulan) gerçek akışla, örnek işler panel durumunda ilerler.
(function () {
  const V = window.TP_VERI;
  const { $, $$, esc } = TP;
  const DUKKAN = V.dukkan(V.DEMO_DUKKAN);
  const SIMDI = Date.now();
  const saatOnce = (s) => SIMDI - s * 3600e3;
  const yarin = (saat, dakika) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(saat, dakika, 0, 0); return d.getTime(); };
  const paketYazi = (a) => (a.paket && a.paket !== V.PAKET_BILMIYORUM ? a.paket : "paket belirtilmedi");
  const katAdlari = (ids) => ids.map((k) => V.kategori(k).ad).join(", ");
  const sayiOku = (v) => Number(String(v || "").replace(/\D/g, "")) || 0;

  const GORUNUMLER = {
    ozet: ["Özet", "Bugün seni bekleyenler"],
    talepler: ["Gelen talepler", "Kategorine ve hizmet bölgene düşen talepler"],
    teklifler: ["Tekliflerim", "Verdiğin tekliflerin durumu"],
    isler: ["Aktif işler", "Randevudan müşteri onayına kadar işlerin"],
    hakedis: ["Hakedişler", "Güvencedeki ve aktarılan ödemeler"],
    degerlendirmeler: ["Değerlendirmeler", "Doğrulanmış işlerden gelen puanlar"],
    profil: ["Profil ve ayarlar", "Kategoriler, hizmet bölgesi ve doğrulama"],
  };
  const DURUM_ETIKET = { beklemede: ["Beklemede", "badge-tq"], secildi: ["Seçildi", "badge-success"], secilmedi: ["Seçilmedi", "badge-outline"], "suresi-doldu": ["Süresi doldu", "badge-outline"] };
  const HAKEDIS_ETIKET = { guvende: ["Güvencede · onarım sürüyor", "badge-tq"], onay: ["Müşteri onayı bekleniyor", "badge-warn"], aktarilacak: ["Aktarılacak (T+1)", "badge-solid"], aktarildi: ["Aktarıldı", "badge-success"] };

  // Örnek veriler (demo talepleri bunlara eklenir)
  const ORNEK_TEKLIFLER = [
    { talep: "TP-4796", arac: "Hyundai i20 · 2021", kategoriler: ["kaporta"], tutar: 8450, zaman: saatOnce(20), durum: "beklemede" },
    { talep: "TP-4781", arac: "Renault Megane Sedan · 2018", kategoriler: ["kaporta", "boya"], tutar: 11200, zaman: saatOnce(52), durum: "secildi" },
    { talep: "TP-4777", arac: "Fiat Egea Sedan · 2022", kategoriler: ["boya"], tutar: 6900, zaman: saatOnce(60), durum: "secildi" },
    { talep: "TP-4770", arac: "Opel Astra · 2016", kategoriler: ["boya"], tutar: 7300, zaman: saatOnce(75), durum: "secilmedi" },
    { talep: "TP-4764", arac: "Ford Focus · 2019", kategoriler: ["kaporta"], tutar: 9800, zaman: saatOnce(98), durum: "secilmedi" },
    { talep: "TP-4751", arac: "Skoda Octavia · 2020", kategoriler: ["kaporta", "boya"], tutar: 13650, zaman: saatOnce(190), durum: "suresi-doldu" },
  ];
  const ORNEK_ISLER = [
    { id: "TP-4790", arac: { marka: "Peugeot", model: "3008", yil: 2021 }, kapsam: ["kaporta", "boya"], musteri: "Elif Kaya", tel: "5351112233", tutar: 15750, asama: "secildi", randevu: yarin(9, 0) },
    { id: "TP-4786", arac: { marka: "Toyota", model: "C-HR", yil: 2020 }, kapsam: ["kaporta"], musteri: "Can Demir", tel: "5324445566", tutar: 9850, asama: "dukkanda", kesinGirildi: false },
    { id: "TP-4779", arac: { marka: "Volkswagen", model: "Passat", yil: 2019 }, kapsam: ["kaporta", "boya"], musteri: "Zeynep Arslan", tel: "5427778899", tutar: 21400, asama: "onarimda" },
    { id: "TP-4772", arac: { marka: "Renault", model: "Clio", yil: 2018 }, kapsam: ["boya"], musteri: "Ahmet Şahin", tel: "5053334455", tutar: 6800, asama: "onay", teslimAlma: saatOnce(20) },
  ];
  const ORNEK_HAKEDIS = [
    { id: "TP-4758", arac: "Kia Ceed", tutar: 9180, durum: "aktarilacak", tarih: saatOnce(22) },
    { id: "TP-4744", arac: "Honda Civic", tutar: 14250, durum: "aktarildi", tarih: saatOnce(24 * 4) },
    { id: "TP-4731", arac: "Dacia Duster", tutar: 7600, durum: "aktarildi", tarih: saatOnce(24 * 9) },
    { id: "TP-4720", arac: "BMW 1 Serisi", tutar: 18900, durum: "aktarildi", tarih: saatOnce(24 * 15) },
  ];

  // ---------- Panel durumu ----------
  const dd = () => ({ kategoriler: DUKKAN.kategoriler.slice(), acik: true, yaricap: 15, teklifler: {}, isler: {}, yanitlar: {}, ...TP.dukkanDurumu() });
  const ddYaz = (parca) => TP.dukkanDurumuYaz(parca);
  const mesafe = (t) => (t.ilce === DUKKAN.ilce ? 1.4 : t.il === DUKKAN.il ? 7.8 : 25);
  const teklifId = (talepId) => `${talepId}-${DUKKAN.id}`;

  function demoTeklifTalepleri() { return TP.talepler().filter((t) => t.asama === "teklif"); }
  function gelenTalepler() {
    const d = dd();
    const uyar = (kats) => kats.some((k) => d.kategoriler.includes(k));
    const demolar = demoTeklifTalepleri().filter((t) => uyar(t.kategoriler)).map((t) => ({
      id: t.id, demo: true, talep: t, arac: t.arac, kategoriler: t.kategoriler, il: t.il, ilce: t.ilce, mesafeKm: mesafe(t),
      kalanDk: Math.max(0, (TP.teklifBitis(t) - Date.now()) / 60000), fotolar: t.fotolar || [], aciklama: t.aciklama,
      teklifSayisi: TP.gorunurTeklifler(t).filter((q) => q.dukkan.id !== DUKKAN.id).length,
    }));
    const ornekler = V.panelTalepleri.filter((t) => uyar(t.kategoriler)).map((t) => ({ ...t, demo: false, fotolar: [] }));
    return [...demolar, ...ornekler];
  }
  function benimTeklifim(t) {
    if (t.demo) {
      const q = t.talep.teklifler.find((x) => x.id === teklifId(t.id));
      return q && q.durum !== "geri-cekildi" ? q : null;
    }
    return dd().teklifler[t.id] || null;
  }
  function isleriTopla() {
    const d = dd();
    const demolar = TP.talepler().filter((t) => {
      const q = TP.secilenTeklif(t);
      return q && q.dukkan.id === DUKKAN.id && ["secildi", "dukkanda", "onarimda", "onay", "itiraz"].includes(t.asama);
    }).map((t) => ({
      id: t.id, demo: true, talep: t, arac: t.arac, kapsam: TP.secilenTeklif(t).kapsam, musteri: `${t.iletisim.ad} ${t.iletisim.soyad}`,
      tel: t.iletisim.tel, tutar: t.odeme ? t.odeme.tutar + (t.odeme.ekTutar || 0) : TP.odenecekTutar(t), asama: t.asama, randevu: t.randevu,
      teslimAlma: t.teslimAlma && t.teslimAlma.zaman, kesinGirildi: !!t.kesinFiyat, ekIs: t.ekIs,
    }));
    const ornekler = ORNEK_ISLER.map((o) => ({ ...o, ...(d.isler[o.id] || {}) })).filter((o) => o.asama !== "tamamlandi");
    return [...demolar, ...ornekler];
  }
  const aksiyonGerekli = (i) => i.asama === "secildi" || (i.asama === "dukkanda" && !i.kesinGirildi) || i.asama === "onarimda" || (i.asama === "onay" && !i.teslimAlma) || i.asama === "itiraz";

  function hakedisSatirlari() {
    const demolar = TP.talepler().filter((t) => { const q = TP.secilenTeklif(t); return q && q.dukkan.id === DUKKAN.id && t.odeme; }).map((t) => ({
      id: t.id, arac: TP.aracAdi(t.arac), tutar: t.odeme.tutar + (t.odeme.ekTutar || 0), demo: true,
      durum: t.odeme.durum === "aktarildi" ? "aktarilacak" : ["onay", "itiraz"].includes(t.asama) ? "onay" : "guvende", tarih: t.onayZamani || t.odeme.zaman,
    }));
    const isler = ORNEK_ISLER.map((o) => ({ ...o, ...(dd().isler[o.id] || {}) }))
      .filter((o) => ["onarimda", "onay", "tamamlandi"].includes(o.asama))
      .map((o) => ({ id: o.id, arac: TP.aracAdi(o.arac), tutar: o.tutar, durum: o.asama === "onarimda" ? "guvende" : o.asama === "onay" ? "onay" : "aktarilacak", tarih: o.teslimAlma || saatOnce(30) }));
    return [...demolar, ...isler, ...ORNEK_HAKEDIS];
  }

  // ---------- Görünümler ----------
  function ozetGorunumu() {
    const gelen = gelenTalepler();
    const bekleyen = gelen.filter((t) => !benimTeklifim(t));
    const isler = isleriTopla();
    const aksiyonlar = isler.filter(aksiyonGerekli);
    const guvende = hakedisSatirlari().filter((h) => ["guvende", "onay"].includes(h.durum)).reduce((s, h) => s + h.tutar * (1 - TP.KOMISYON), 0);
    const saat = new Date().getHours();
    const selam = saat < 12 ? "Günaydın" : saat < 18 ? "İyi günler" : "İyi akşamlar";
    return `
      <div class="selam"><h2>${selam}, ${esc(DUKKAN.sahibi.split(" ")[0])} Usta</h2><p>${bekleyen.length} talep teklifini bekliyor, ${aksiyonlar.length} iş için aksiyon gerekiyor.</p></div>
      <div class="kpi-grid">
        <div class="kpi"><span class="etiket">${TP.ikon("inbox")}Teklif bekleyen talep</span><span class="deger">${bekleyen.length}</span><span class="alt">Kategorin ve bölgendeki talepler</span></div>
        <div class="kpi"><span class="etiket">${TP.ikon("trending-up")}Kazanma oranı</span><span class="deger">%34</span><span class="alt">Son 30 günde 58 tekliften 20'si seçildi</span></div>
        <div class="kpi"><span class="etiket">${TP.ikon("wrench")}Aktif iş</span><span class="deger">${isler.length}</span><span class="alt">${aksiyonlar.length} tanesi aksiyon bekliyor</span></div>
        <div class="kpi koyu"><span class="etiket">${TP.ikon("lock")}Güvencedeki net hakediş</span><span class="deger">${TP.tl(guvende)}</span><span class="alt">Müşteri onayıyla hesabına geçer</span></div>
      </div>
      <div class="iki-kolon">
        <section class="kart"><div class="kart-bas"><h2>Aksiyon bekleyenler</h2><a class="link-btn" href="#isler">Tüm işler</a></div>
          <div class="aksiyon-liste">${aksiyonlar.map(aksiyonSatiri).join("") || `<p class="soluk">Şu an bekleyen aksiyon yok.</p>`}</div>
        </section>
        <section class="kart"><div class="kart-bas"><h2>Yeni talepler</h2><a class="link-btn" href="#talepler">Tümü</a></div>
          <div class="aksiyon-liste">${bekleyen.slice(0, 4).map((t) => `
            <div class="aksiyon"><span class="ikon-kutu" style="background:var(--tq-50);color:var(--tq-600)">${TP.ikon(V.kategori(t.kategoriler[0]).ikon)}</span>
              <div><b>${esc(TP.aracAdi(t.arac))} · ${t.arac.yil}${t.demo ? ` <span class="badge badge-solid">Demo</span>` : ""}</b><small>${katAdlari(t.kategoriler)} · ${esc(t.ilce)} · ${TP.sure(t.kalanDk * 60000)} kaldı</small></div>
              <button type="button" class="btn btn-primary btn-sm" data-teklif-ver="${t.id}">Teklif ver</button></div>`).join("") || `<p class="soluk">Teklif bekleyen talep yok.</p>`}</div>
        </section>
      </div>
      <section class="kart"><div class="kart-bas"><h2>Karşılıklı kurallar</h2><a class="link-btn" href="akis.html#kurallar">Tümünü oku</a></div>
        <ul class="kural-listesi">
          <li>${TP.ikon("eye")}<span>Müşterinin adı ve telefonu teklifin seçilince açılır. Teklif notunda iletişim bilgisi paylaşılamaz.</span></li>
          <li>${TP.ikon("scale")}<span>Araç görüldükten sonra fiyatı yalnızca bir kez, gerekçe ve fotoğrafla revize edebilirsin.</span></li>
          <li>${TP.ikon("lock")}<span>Onarıma, müşteri kesin fiyatı onaylayıp ödeme güvenceye alındıktan sonra başla.</span></li>
          <li>${TP.ikon("hand-coins")}<span>Hakedişin karşılıklı onaydan sonra T+1 iş günü içinde, %10 komisyon düşülerek IBAN'ına geçer.</span></li>
        </ul>
      </section>`;
  }
  function aksiyonSatiri(i) {
    const [metin, buton, eylem] = {
      secildi: ["Araç teslimi bekleniyor", "Teslim kodunu gir", "teslim"],
      dukkanda: ["Aracı incele, kesin fiyatı gir", "Kesin fiyatı gir", "kesin"],
      onarimda: ["Onarım sürüyor", "Onarımı tamamla", "tamamla"],
      onay: ["Aracın teslim alınması bekleniyor", "Teslim alma kodu", "teslimet"],
      itiraz: ["Müşteri sorun bildirdi, ödeme bekletiliyor", "Çözüm öner", "itiraz"],
    }[i.asama];
    return `<div class="aksiyon"><span class="ikon-kutu">${TP.ikon(i.asama === "itiraz" ? "flag" : "clock-alert")}</span>
      <div><b>${esc(i.id)} · ${esc(TP.aracAdi(i.arac))}${i.demo ? ` <span class="badge badge-solid">Demo</span>` : ""}</b><small>${metin}</small></div>
      <button type="button" class="btn btn-secondary btn-sm" data-is="${i.id}" data-eylem="${eylem}">${buton}</button></div>`;
  }

  const talepFiltre = { kategori: "", sadeceBekleyen: false, sirala: "yeni" };
  function taleplerGorunumu() {
    const d = dd();
    let liste = gelenTalepler();
    if (talepFiltre.kategori && d.kategoriler.includes(talepFiltre.kategori)) liste = liste.filter((t) => t.kategoriler.includes(talepFiltre.kategori));
    if (talepFiltre.sadeceBekleyen) liste = liste.filter((t) => !benimTeklifim(t));
    const siralayici = { yeni: (a, b) => b.demo - a.demo || b.kalanDk - a.kalanDk, kalan: (a, b) => a.kalanDk - b.kalanDk, yakin: (a, b) => a.mesafeKm - b.mesafeKm }[talepFiltre.sirala];
    liste.sort(siralayici);
    const uymayan = demoTeklifTalepleri().filter((t) => !t.kategoriler.some((k) => d.kategoriler.includes(k)));
    return `
      ${!d.acik ? `<p class="notice warn">${TP.ikon("power")}<span><b>Teklif almaya kapalısın.</b> Yeni talepler sana düşmez; mevcut taleplere teklif verebilirsin. Kapasiten açılınca üstteki anahtardan tekrar aç.</span></p>` : ""}
      <p class="notice">${TP.ikon("funnel")}<span>Kategorilerin: <b>${katAdlari(d.kategoriler)}</b> · Hizmet bölgen: <b>${esc(DUKKAN.ilce)} merkezli ${d.yaricap} km</b>. Müşterinin adı ve telefonu, teklifin seçilirse açılır.</span></p>
      ${uymayan.map((t) => `<p class="notice warn">${TP.ikon("info")}<span>Demo talebin <b>${esc(t.id)}</b> (${katAdlari(t.kategoriler)}) bu dükkanın kategorilerine uymadığı için listede yok; kategori bazlı filtreleme böyle çalışır. Denemek için <a href="#profil">kategorilerini değiştirebilirsin</a>.</span></p>`).join("")}
      <div class="filtre-satiri">
        <div class="chip-row" role="group" aria-label="Kategori">${[["", "Tümü"], ...d.kategoriler.map((k) => [k, V.kategori(k).ad])].map(([k, ad]) => `<button type="button" class="chip" aria-pressed="${k === talepFiltre.kategori}" data-talep-kat="${k}">${ad}</button>`).join("")}</div>
        <label class="gizli-metin" for="talep-sirala">Sırala</label>
        <select class="select" id="talep-sirala">${[["yeni", "En yeni"], ["kalan", "Süresi azalan"], ["yakin", "En yakın"]].map(([k, ad]) => `<option value="${k}" ${k === talepFiltre.sirala ? "selected" : ""}>${ad}</option>`).join("")}</select>
        <label class="switch"><input type="checkbox" id="sadece-bekleyen" ${talepFiltre.sadeceBekleyen ? "checked" : ""}><span>Yalnızca teklif vermediklerim</span></label>
      </div>
      <div class="talep-kartlari">${liste.map(talepKarti).join("") || `<p class="kolon-bos">Bu filtreyle eşleşen talep yok.</p>`}</div>`;
  }
  function talepKarti(t) {
    const q = benimTeklifim(t);
    const kalanMs = t.kalanDk * 60000;
    const fotoSayisi = t.fotolar.length || t.fotoSayisi || 0;
    return `<article class="talep-kart${t.demo ? " demo-talep" : ""}">
      <div class="tk-ust">${TP.plaka(t.id, "kucuk")}${t.demo ? `<span class="badge badge-solid">Demo talebin</span>` : t.yeni ? `<span class="badge badge-tq">Yeni</span>` : ""}${t.demo && t.il !== DUKKAN.il ? `<span class="badge badge-warn">Bölge dışı · demo için gösteriliyor</span>` : ""}<span class="badge ${kalanMs < 3 * 3600e3 ? "badge-warn" : "badge-outline"} kalan">${TP.ikon("timer")}${TP.sure(kalanMs)} kaldı</span></div>
      <h3>${esc(TP.aracAdi(t.arac))} · ${t.arac.yil} · ${esc(paketYazi(t.arac))}</h3>
      <p class="tk-meta"><span>${TP.ikon("map-pin")}${esc(t.ilce)} · ${TP.km(t.mesafeKm)}</span><span>${TP.ikon("camera")}${fotoSayisi} fotoğraf</span><span>${TP.ikon("users")}${t.teklifSayisi} dükkan teklif verdi</span>${t.demo && t.talep.yuruyor === false ? `<span>${TP.ikon("truck")}Araç yürümüyor</span>` : ""}</p>
      ${TP.katEtiketleri(t.kategoriler)}
      <p class="tk-aciklama${t.aciklama ? "" : " soluk"}">${t.aciklama ? esc(t.aciklama) : "Açıklama eklenmemiş."}</p>
      ${fotoSayisi ? `<div class="tk-foto">${t.fotolar.length ? t.fotolar.slice(0, 5).map((f, i) => `<img src="${f}" alt="Hasar fotoğrafı ${i + 1}">`).join("") : Array.from({ length: Math.min(4, fotoSayisi) }, () => `<span>${TP.ikon("image")}</span>`).join("")}</div>` : ""}
      <p class="tk-gizli">${TP.ikon("lock")}Müşteri adı ve telefonu teklifin seçilince açılır.</p>
      <div class="tk-alt">
        ${q ? `<span class="tk-teklifim">Teklifin: <b>${TP.tl(q.tutar)}</b> · Beklemede</span><button type="button" class="btn btn-ghost btn-sm" data-geri-cek="${t.id}">Geri çek</button><button type="button" class="btn btn-secondary btn-sm" data-teklif-ver="${t.id}">${TP.ikon("pencil")}Güncelle</button>`
          : `<button type="button" class="btn btn-ghost btn-sm" data-ek-bilgi="${t.id}">${TP.ikon("message-square")}Ek bilgi iste</button><button type="button" class="btn btn-primary btn-sm" data-teklif-ver="${t.id}">Teklif ver</button>`}
      </div>
    </article>`;
  }

  let teklifSekme = "beklemede";
  function tumTekliflerim() {
    const demolar = TP.talepler().flatMap((t) => t.teklifler.filter((q) => q.dukkan.id === DUKKAN.id && q.durum !== "geri-cekildi").map((q) => ({
      talep: t.id, arac: `${TP.aracAdi(t.arac)} · ${t.arac.yil}`, kategoriler: t.kategoriler, tutar: q.tutar, zaman: q.zaman, demo: true,
      durum: q.durum === "beklemede" && t.asama !== "teklif" ? "secilmedi" : q.durum,
    })));
    const kayitli = Object.values(dd().teklifler).map((x) => ({ ...x, durum: "beklemede" }));
    return [...demolar, ...kayitli, ...ORNEK_TEKLIFLER];
  }
  function tekliflerGorunumu() {
    const liste = tumTekliflerim();
    const sekmeler = [["beklemede", "Beklemede"], ["secildi", "Seçildi"], ["secilmedi", "Seçilmedi"], ["suresi-doldu", "Süresi doldu"]];
    const gosterilen = liste.filter((x) => x.durum === teklifSekme);
    return `
      <div class="seg" role="group" aria-label="Teklif durumu">${sekmeler.map(([k, ad]) => `<button type="button" aria-pressed="${k === teklifSekme}" data-teklif-sekme="${k}">${ad} (${liste.filter((x) => x.durum === k).length})</button>`).join("")}</div>
      <div class="tablo-kap"><table class="veri-tablo">
        <thead><tr><th>Talep</th><th>Araç</th><th>İş</th><th class="sag">Teklif</th><th class="sag">Net hakediş</th><th>Verildi</th><th>Durum</th></tr></thead>
        <tbody>${gosterilen.map((x) => `<tr><td>${TP.plaka(x.talep, "kucuk")}</td><td>${esc(x.arac)}${x.demo ? ` <span class="badge badge-solid">Demo</span>` : ""}</td><td>${katAdlari(x.kategoriler)}</td><td class="sag">${TP.tl(x.tutar)}</td><td class="sag">${TP.tl(x.tutar * (1 - TP.KOMISYON))}</td><td class="kucuk-yazi">${TP.once(x.zaman)}</td><td><span class="badge badge-dot ${DURUM_ETIKET[x.durum][1]}">${DURUM_ETIKET[x.durum][0]}</span></td></tr>`).join("") || `<tr><td colspan="7" class="kucuk-yazi">Bu durumda teklif yok.</td></tr>`}</tbody>
      </table></div>
      <p class="hint">Teklifler kapalı zarftır: diğer dükkanların fiyatlarını göremezsin. Müşteri seçim yaptığında sonuç sana bildirilir.</p>`;
  }

  function islerGorunumu() {
    const isler = isleriTopla();
    const kolonlar = [["secildi", "Randevu · teslim bekleniyor"], ["dukkanda", "Araç dükkanda · kesin fiyat"], ["onarimda", "Onarımda · ödeme güvende"], ["onay", "Müşteri onayı bekleniyor"]];
    return `
      <p class="notice">${TP.ikon("key-round")}<span>Teslim ve teslim alma anları müşterinin ekranındaki 4 haneli kodla kayda geçer. Onarıma, ödeme güvenceye alınmadan başlama.</span></p>
      <div class="hat">${kolonlar.map(([asama, ad]) => {
        const k = isler.filter((i) => i.asama === asama || (asama === "onay" && i.asama === "itiraz"));
        return `<section class="kolon" aria-label="${ad}"><div class="kolon-bas"><span>${ad}</span><span class="badge">${k.length}</span></div>${k.map(isKarti).join("") || `<p class="kolon-bos">Bu aşamada iş yok.</p>`}</section>`;
      }).join("")}</div>`;
  }
  function isKarti(i) {
    const buton = (eylem, metin, sinif = "btn-secondary", ikon = "") => `<button type="button" class="btn ${sinif} btn-sm" data-is="${i.id}" data-eylem="${eylem}">${ikon ? TP.ikon(ikon) : ""}${metin}</button>`;
    let not = "", butonlar = "";
    switch (i.asama) {
      case "secildi":
        not = i.randevu ? `Randevu: ${TP.tarihSaat(i.randevu)}` : "Müşteri henüz randevu seçmedi";
        butonlar = buton("teslim", "Teslim kodunu gir", "btn-primary", "key-round");
        break;
      case "dukkanda":
        not = i.kesinGirildi ? "Kesin fiyat gönderildi; müşterinin onayı ve ödemesi bekleniyor" : "Aracı incele ve 24 saat içinde kesin fiyatı gir";
        butonlar = i.kesinGirildi ? "" : buton("kesin", "Kesin fiyatı gir", "btn-primary", "receipt-turkish-lira");
        break;
      case "onarimda":
        not = `Ödeme güvende: ${TP.tl(i.tutar)}${i.ekIs && i.ekIs.durum === "bekliyor" ? " · ek iş onayı bekleniyor" : ""}`;
        butonlar = buton("ilerleme", "İlerleme ekle") + (i.ekIs ? "" : buton("ekis", "Ek iş talep et")) + buton("tamamla", "Onarımı tamamla", "btn-primary", "circle-check");
        break;
      case "onay":
        not = i.teslimAlma ? `Araç teslim edildi · otomatik onaya ${TP.sure(i.teslimAlma + TP.OTOMATIK_ONAY_SAAT * 3600e3 - Date.now())}` : "Onarım bitti; aracın teslim alınması bekleniyor";
        butonlar = i.teslimAlma ? "" : buton("teslimet", "Teslim alma kodunu gir", "btn-primary", "key-round");
        break;
      case "itiraz":
        not = "Müşteri sorun bildirdi; ödeme bekletiliyor. 48 saat içinde çözüm öner.";
        butonlar = buton("itiraz", "Çözüm öner", "btn-danger", "scale");
        break;
      default:
    }
    return `<article class="is-kart${i.demo ? " demo-talep" : ""}">
      <div class="tk-ust">${TP.plaka(i.id, "kucuk")}${i.demo ? `<span class="badge badge-solid">Demo</span>` : ""}${i.asama === "itiraz" ? `<span class="badge badge-danger">Sorun bildirildi</span>` : ""}</div>
      <h3>${esc(TP.aracAdi(i.arac))} · ${i.arac.yil}</h3>
      <div class="satir"><span>${esc(i.musteri)}</span><span class="tnum">${TP.telBicim(i.tel)}</span></div>
      <div class="satir"><span>${katAdlari(i.kapsam)}</span><b>${TP.tl(i.tutar)}</b></div>
      <p class="durum-not">${TP.ikon("info")}<span>${not}</span></p>
      ${butonlar ? `<div class="btn-grup">${butonlar}</div>` : ""}
    </article>`;
  }

  function hakedisGorunumu() {
    const s = hakedisSatirlari();
    const toplam = (durumlar) => s.filter((h) => durumlar.includes(h.durum)).reduce((a, h) => a + h.tutar * (1 - TP.KOMISYON), 0);
    return `
      <div class="kpi-grid">
        <div class="kpi"><span class="etiket">${TP.ikon("lock")}Güvencede</span><span class="deger">${TP.tl(toplam(["guvende"]))}</span><span class="alt">Onarımı süren işler (net)</span></div>
        <div class="kpi"><span class="etiket">${TP.ikon("hourglass")}Müşteri onayında</span><span class="deger">${TP.tl(toplam(["onay"]))}</span><span class="alt">Teslimden 72 saat sonra otomatik onay</span></div>
        <div class="kpi koyu"><span class="etiket">${TP.ikon("landmark")}Aktarılacak (T+1)</span><span class="deger">${TP.tl(toplam(["aktarilacak"]))}</span><span class="alt">Bir sonraki iş günü IBAN'ına</span></div>
        <div class="kpi"><span class="etiket">${TP.ikon("hand-coins")}Bu ay aktarılan</span><span class="deger">${TP.tl(toplam(["aktarildi"]))}</span><span class="alt">Komisyon düşülmüş net tutar</span></div>
      </div>
      <section class="kart">
        <div class="kart-bas"><div><h2>Ödeme hareketleri</h2><p>Komisyon, müşterinin ödediği tutar üzerinden %10'dur ve ödeme altyapısı maliyetini kapsar.</p></div></div>
        <div class="tablo-kap"><table class="veri-tablo">
          <thead><tr><th>İş</th><th>Araç</th><th class="sag">Müşteri ödemesi</th><th class="sag">Komisyon</th><th class="sag">Net hakediş</th><th>Durum</th><th>Tarih</th></tr></thead>
          <tbody>${s.map((h) => `<tr><td>${TP.plaka(h.id, "kucuk")}</td><td>${esc(h.arac)}${h.demo ? ` <span class="badge badge-solid">Demo</span>` : ""}</td><td class="sag">${TP.tl(h.tutar)}</td><td class="sag">−${TP.tl(h.tutar * TP.KOMISYON)}</td><td class="sag"><b>${TP.tl(h.tutar * (1 - TP.KOMISYON))}</b></td><td><span class="badge badge-dot ${HAKEDIS_ETIKET[h.durum][1]}">${HAKEDIS_ETIKET[h.durum][0]}</span></td><td class="kucuk-yazi">${TP.tarih(h.tarih)}</td></tr>`).join("")}</tbody>
        </table></div>
      </section>
      <section class="kart">
        <div class="kart-bas"><h2>Hesap bilgileri</h2><span class="badge badge-success">${TP.ikon("badge-check")}Doğrulandı</span></div>
        <div class="kirilim">
          <div class="satir"><span>IBAN</span><span class="tnum">TR•• •••• •••• •••• •••• ••45 21</span></div>
          <div class="satir"><span>Hesap sahibi</span><span>Turkuaz Kaporta Boya Ltd. Şti.</span></div>
          <div class="satir"><span>Alt üye işyeri</span><span>Aktif · lisanslı ödeme kuruluşu</span></div>
        </div>
        <p class="hint">IBAN değişikliği güvenlik nedeniyle belge doğrulamasıyla yapılır. TamirPort, komisyon tutarı için sana aylık fatura keser.</p>
      </section>`;
  }

  function degerlendirmelerGorunumu() {
    const d = dd();
    const demolar = TP.talepler().filter((t) => { const q = TP.secilenTeklif(t); return q && q.dukkan.id === DUKKAN.id && t.degerlendirme; }).map((t) => ({
      id: "demo-" + t.id, ad: `${t.iletisim.ad} ${(t.iletisim.soyad || "")[0] || ""}.`, arac: `${TP.aracAdi(t.arac)} · ${katAdlari(TP.secilenTeklif(t).kapsam)}`,
      puan: t.degerlendirme.puan, metin: t.degerlendirme.yorum, gunOnce: 0, yeni: true,
    }));
    const yorumlar = [...demolar, ...V.yorumlar.map((y, i) => ({ ...y, id: "y" + i }))];
    const dagilim = [[5, 82], [4, 13], [3, 3], [2, 1], [1, 1]];
    return `
      <section class="kart">
        <div class="puan-ozet">
          <div class="puan-buyuk"><b>${TP.puan(DUKKAN.puan)}</b>${TP.yildiz(DUKKAN.puan)}<span>${TP.sayi(DUKKAN.degerlendirme)} değerlendirme</span></div>
          <div class="dagilim">${dagilim.map(([y, p]) => `<div class="satir"><span>${y} ★</span><span class="bar"><span style="width:${p}%"></span></span><b>%${p}</b></div>`).join("")}</div>
          <div>${TP.kriterCubuklari(DUKKAN.kriterler)}</div>
        </div>
        <p class="hint">Puanın yalnızca platformda tamamlanan işlerin değerlendirmelerinden, Bayes ortalamasıyla hesaplanır. Her yoruma bir kez herkese açık yanıt verebilirsin.</p>
      </section>
      <section class="kart"><div class="kart-bas"><h2>Yorumlar</h2></div>
        ${yorumlar.map((y) => `<article class="yorum">
          <header><b>${esc(y.ad)}</b>${TP.yildiz(y.puan)}<span class="soluk">${y.gunOnce ? y.gunOnce + " gün önce" : "bugün"}</span>${y.yeni ? `<span class="badge badge-solid">Yeni</span>` : ""}</header>
          ${y.metin ? `<p>${esc(y.metin)}</p>` : ""}
          <footer><span class="badge badge-success">${TP.ikon("badge-check")}Doğrulanmış iş</span><span class="soluk">${esc(y.arac)}</span></footer>
          ${d.yanitlar[y.id] ? `<p class="yanit"><b>Yanıtın:</b> ${esc(d.yanitlar[y.id])}</p>` : `<div data-yanit-alan="${y.id}"><button type="button" class="link-btn" data-yanitla="${y.id}">Yanıtla</button></div>`}
        </article>`).join("")}
      </section>`;
  }

  function profilGorunumu() {
    const d = dd();
    return `<div class="iki-kolon">
      <section class="kart">
        <div class="kart-bas"><h2>Hizmet kategorileri</h2></div>
        <p class="soluk">Yalnızca seçtiğin kategorilerdeki talepler sana düşer. Değiştirdiğinde Gelen talepler listesi hemen güncellenir.</p>
        <div class="chip-row">${V.kategoriler.map((k) => `<button type="button" class="chip" aria-pressed="${d.kategoriler.includes(k.id)}" data-profil-kat="${k.id}">${TP.ikon(k.ikon)}${k.ad}</button>`).join("")}</div>
        <div>
          <div class="ayar-satiri"><div><b>Hizmet bölgesi</b><small>${esc(DUKKAN.ilce)} merkezli yarıçap</small></div><div class="aralik-girdi"><input type="range" min="5" max="30" step="5" value="${d.yaricap}" id="yaricap" aria-label="Hizmet yarıçapı"><b id="yaricap-deger">${d.yaricap} km</b></div></div>
          <div class="ayar-satiri"><div><b>İşçilik garantisi taahhüdü</b><small>Anlaşmalı firma rozeti için en az 6 ay</small></div><select class="select" style="width:auto" aria-label="Garanti süresi"><option>6 ay</option><option selected>12 ay</option><option>24 ay</option></select></div>
          <div class="ayar-satiri"><div><b>Günlük araç kabul kapasitesi</b><small>Müşteriler bu kapasiteye göre randevu alır</small></div><select class="select" style="width:auto" aria-label="Günlük kapasite"><option>2 araç</option><option>3 araç</option><option selected>4 araç</option><option>6 araç</option></select></div>
          <div class="ayar-satiri"><div><b>Çalışma saatleri</b><small>${esc(DUKKAN.saatler)}</small></div><span class="badge badge-outline">${TP.ikon("calendar-clock")}Takvimle eşitli</span></div>
        </div>
      </section>
      <section class="kart">
        <div class="kart-bas"><h2>Doğrulama</h2><span class="badge badge-success">${TP.ikon("badge-check")}Anlaşmalı firma</span></div>
        <ul class="dogrulama">${["Vergi levhası", "Esnaf ve sanatkâr / ticaret sicil kaydı", "İşyeri adresi ve fotoğrafları", "Dükkan adına IBAN", "Ödeme kuruluşu alt üye işyeri kaydı", "Hizmet sözleşmesi ve kuralların onayı", "En az 6 ay işçilik garantisi taahhüdü"].map((x) => `<li>${TP.ikon("circle-check")}${x}</li>`).join("")}</ul>
        <div>
          <div class="ayar-satiri"><div><b>Yeni talep bildirimleri</b><small>SMS ve uygulama bildirimi</small></div><label class="switch"><input type="checkbox" checked><span class="gizli-metin">Yeni talep bildirimleri</span></label></div>
          <div class="ayar-satiri"><div><b>Günlük özet e-postası</b><small>Her sabah 08:00</small></div><label class="switch"><input type="checkbox"><span class="gizli-metin">Günlük özet e-postası</span></label></div>
        </div>
        <a class="btn btn-secondary" href="akis.html#kurallar">${TP.ikon("book-open")}Dükkan kurallarını oku</a>
      </section>
    </div>`;
  }

  // ---------- Teklif formu ----------
  function paraAlaniBagla(input, fn) {
    input.addEventListener("input", () => {
      const n = sayiOku(input.value);
      input.value = n ? TP.sayi(n) : "";
      input.closest(".field")?.classList.remove("has-error");
      fn && fn();
    });
  }
  function teklifFormu(id) {
    const t = gelenTalepler().find((x) => x.id === id);
    if (!t) { TP.toast("Bu talep artık teklife açık değil.", { tur: "uyari" }); ciz(); return; }
    const mevcut = benimTeklifim(t);
    const d = dd();
    const parca = mevcut ? mevcut.parcaTuru : t.kategoriler.every((k) => k === "boya") ? "yok" : "orijinal";
    const dlg = TP.modal({
      baslik: mevcut ? "Teklifini güncelle" : "Teklif ver",
      alt: `${esc(t.id)} · ${esc(TP.aracAdi(t.arac))} ${t.arac.yil} · ${katAdlari(t.kategoriler)} · ${esc(t.ilce)}`,
      icerik: `<form class="form-grid" id="teklif-formu" novalidate>
        <div class="field" data-alan="tutar"><label for="tf-tutar">Toplam tutar (KDV dahil)</label>
          <div class="input-group"><input class="input tnum" id="tf-tutar" inputmode="numeric" autocomplete="off" placeholder="Örn. 12.450" value="${mevcut ? TP.sayi(mevcut.tutar) : ""}"><span class="suffix">₺</span></div>
          <span class="field-error">Geçerli bir tutar yaz (en az 250 ₺).</span><span class="hint">Müşterinin ödeyeceği toplam tutardır; komisyon hakedişinden düşülür.</span></div>
        <div class="grid-2">
          <div class="field"><label for="tf-iscilik">İşçilik <span class="opt">İsteğe bağlı</span></label><input class="input tnum" id="tf-iscilik" inputmode="numeric" value="${mevcut && mevcut.iscilik ? TP.sayi(mevcut.iscilik) : ""}"></div>
          <div class="field"><label for="tf-parca">Parça <span class="opt">İsteğe bağlı</span></label><input class="input tnum" id="tf-parca" inputmode="numeric" value="${mevcut && mevcut.parca ? TP.sayi(mevcut.parca) : ""}"></div>
        </div>
        <div class="field"><span class="label" id="tf-parca-etiket">Parça türü</span><div class="seg" role="group" aria-labelledby="tf-parca-etiket">${Object.entries(TP.PARCA).map(([k, ad]) => `<button type="button" aria-pressed="${k === parca}" data-parca="${k}">${ad.replace(" parça", "")}</button>`).join("")}</div></div>
        <div class="grid-2">
          <div class="field" data-alan="sure"><label for="tf-sure">Tahmini süre (iş günü)</label><input class="input tnum" id="tf-sure" type="number" min="1" max="30" value="${mevcut ? mevcut.sureGun : 3}"><span class="field-error">1 ile 30 gün arasında bir süre yaz.</span></div>
          <div class="field"><label for="tf-garanti">İşçilik garantisi</label><select class="select" id="tf-garanti">${[6, 12, 24].map((a) => `<option value="${a}" ${a === (mevcut ? mevcut.garantiAy : DUKKAN.garantiAy) ? "selected" : ""}>${a} ay</option>`).join("")}</select></div>
        </div>
        <div class="field" data-alan="kapsam"><span class="label">Kapsadığın işler</span>
          <div class="check-grid">${t.kategoriler.map((k) => { const hizmet = d.kategoriler.includes(k); const secili = mevcut ? mevcut.kapsam.includes(k) : hizmet; return `<label class="check"><input type="checkbox" name="kapsam" value="${k}" ${secili ? "checked" : ""} ${hizmet ? "" : "disabled"}><span>${V.kategori(k).ad}${hizmet ? "" : " (hizmet vermiyorsun)"}</span></label>`; }).join("")}</div>
          <span class="field-error">En az bir işi kapsamalısın.</span><span class="hint">İşin tamamını kapsamayan teklifler müşteriye "Kısmi teklif" olarak gösterilir.</span></div>
        <div class="grid-2">
          <div class="field"><label for="tf-cekici">Çekici</label><select class="select" id="tf-cekici"><option value="">Yok</option><option value="ucretsiz" ${mevcut && mevcut.cekici === "ucretsiz" ? "selected" : ""}>Ücretsiz</option><option value="ucretli" ${mevcut && mevcut.cekici === "ucretli" ? "selected" : ""}>Ücretli</option></select></div>
          <div class="field"><label for="tf-sokum">Söküm-montaj bedeli</label><div class="input-group"><input class="input tnum" id="tf-sokum" inputmode="numeric" value="${mevcut ? TP.sayi(mevcut.sokumBedeli || 0) : "0"}"><span class="suffix">₺</span></div><span class="hint">Müşteri kesin fiyatı reddederse, yalnızca söküme onay verdiyse alınır.</span></div>
        </div>
        <div class="field" data-alan="not"><label for="tf-not">Müşteriye not <span class="opt">İsteğe bağlı</span></label>
          <textarea class="textarea" id="tf-not" maxlength="400" placeholder="Örn. Çamurluk düzeltilip boyanacak, far çerçevesi orijinaliyle değişecek.">${mevcut ? esc(mevcut.not || "") : ""}</textarea>
          <span class="field-error">Notta telefon numarası, IBAN ya da platform dışı ödeme bilgisi paylaşılamaz.</span></div>
        <div class="hesap-kutu" aria-live="polite">
          <div class="satir"><span>Müşterinin ödeyeceği</span><span id="tf-h-tutar">0 ₺</span></div>
          <div class="satir"><span>Komisyon (%10, ödeme altyapısı dahil)</span><span id="tf-h-kom">0 ₺</span></div>
          <div class="satir net"><span>Net hakedişin</span><span id="tf-h-net">0 ₺</span></div>
        </div>
        <ul class="kural-listesi">
          <li>${TP.ikon("eye")}<span>Teklifin kapalı zarftır; diğer dükkanlar fiyatını görmez.</span></li>
          <li>${TP.ikon("scale")}<span>Araç görüldükten sonra fiyatı yalnızca bir kez, gerekçe ve fotoğrafla revize edebilirsin; revize müşteri onayına tabidir.</span></li>
          <li>${TP.ikon("calendar-check")}<span>Teklif 7 gün geçerlidir. Seçilirsen müşteri takviminden randevu alır.</span></li>
        </ul>
      </form>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: mevcut ? "Teklifi güncelle" : "Teklifi gönder", sinif: "btn-primary", eylem: (x) => teklifGonder(x, t, mevcut) }],
    });
    const hesapla = () => {
      const tutar = sayiOku(dlg.querySelector("#tf-tutar").value);
      const kom = Math.round(tutar * TP.KOMISYON);
      dlg.querySelector("#tf-h-tutar").textContent = TP.tl(tutar);
      dlg.querySelector("#tf-h-kom").textContent = "−" + TP.tl(kom);
      dlg.querySelector("#tf-h-net").textContent = TP.tl(tutar - kom);
    };
    ["#tf-tutar", "#tf-iscilik", "#tf-parca", "#tf-sokum"].forEach((s) => paraAlaniBagla(dlg.querySelector(s), hesapla));
    dlg.querySelector("#teklif-formu").addEventListener("submit", (e) => e.preventDefault());
    dlg.addEventListener("click", (e) => {
      const p = e.target.closest("[data-parca]");
      if (p) dlg.querySelectorAll("[data-parca]").forEach((b) => b.setAttribute("aria-pressed", String(b === p)));
    });
    dlg.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("has-error"));
    dlg.addEventListener("change", (e) => e.target.closest(".field")?.classList.remove("has-error"));
    hesapla();
    setTimeout(() => dlg.querySelector("#tf-tutar").focus(), 60);
  }
  function teklifGonder(dlg, t, mevcut) {
    const tutar = sayiOku(dlg.querySelector("#tf-tutar").value);
    const sure = Number(dlg.querySelector("#tf-sure").value);
    const kapsam = [...dlg.querySelectorAll("input[name=kapsam]:checked")].map((x) => x.value);
    const not = dlg.querySelector("#tf-not").value.trim();
    const hata = (alan) => dlg.querySelector(`[data-alan="${alan}"]`).classList.add("has-error");
    const hatalar = [];
    if (tutar < 250) hatalar.push("tutar");
    if (!(sure >= 1 && sure <= 30)) hatalar.push("sure");
    if (!kapsam.length) hatalar.push("kapsam");
    // Platform dışına yönlendirmeyi önleme: telefon, IBAN ve elden ödeme ifadeleri engellenir
    if (/(\+?90|0)?[\s-]*5\d{2}[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}|\biban\b|\bTR\d{2}|havale|elden|nakit/i.test(not)) hatalar.push("not");
    if (hatalar.length) { hatalar.forEach(hata); return false; }
    const parcaTuru = dlg.querySelector("[data-parca][aria-pressed=true]").dataset.parca;
    const iscilikGirilen = sayiOku(dlg.querySelector("#tf-iscilik").value);
    const iscilik = parcaTuru === "yok" ? tutar : Math.min(tutar, iscilikGirilen || Math.round((tutar * 0.45) / 50) * 50);
    const teklif = {
      tutar, iscilik, parca: tutar - iscilik, parcaTuru, sureGun: sure, garantiAy: Number(dlg.querySelector("#tf-garanti").value), kapsam,
      cekici: dlg.querySelector("#tf-cekici").value || null, sokumBedeli: sayiOku(dlg.querySelector("#tf-sokum").value), not, zaman: Date.now(), durum: "beklemede",
    };
    if (t.demo) {
      const talep = TP.talepGetir(t.id);
      if (!talep || talep.asama !== "teklif") { TP.toast("Müşteri bu talepte seçim yaptı; teklif kapandı.", { tur: "uyari" }); ciz(); return undefined; }
      const q = { id: teklifId(talep.id), dukkan: { ...DUKKAN }, ...teklif, mesafeKm: mesafe(talep), gelisSn: 0, kaynak: "panel" };
      const i = talep.teklifler.findIndex((x) => x.id === q.id);
      const guncelleme = i >= 0 && talep.teklifler[i].durum !== "geri-cekildi";
      if (guncelleme) q.guncellendi = true;
      if (i >= 0) talep.teklifler[i] = q; else talep.teklifler.push(q);
      talep.olaylar.push({ zaman: Date.now(), metin: `${DUKKAN.ad} ${guncelleme ? "teklifini güncelledi" : "teklif verdi"}: ${TP.tl(tutar)}`, kim: "dukkan" });
      TP.talepKaydet(talep);
    } else {
      const d = dd();
      d.teklifler[t.id] = { ...teklif, talep: t.id, arac: `${TP.aracAdi(t.arac)} · ${t.arac.yil}`, kategoriler: t.kategoriler };
      ddYaz({ teklifler: d.teklifler });
    }
    TP.toast(mevcut ? "Teklifin güncellendi ve müşteriye bildirildi." : `Teklifin gönderildi: ${TP.tl(tutar)}.${t.demo ? " Müşterinin takip sayfasında göründü." : ""}`, { tur: "basari" });
    ciz();
    return undefined;
  }
  function geriCek(id) {
    TP.modal({
      baslik: "Teklifini geri çek",
      icerik: `<p>Teklifin müşterinin listesinden kalkar. Müşteri seçim yapana kadar yeniden teklif verebilirsin.</p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Geri çek", sinif: "btn-danger", eylem: () => {
        const t = gelenTalepler().find((x) => x.id === id);
        if (t && t.demo) {
          const talep = TP.talepGetir(id);
          const q = talep.teklifler.find((x) => x.id === teklifId(id));
          if (q) { q.durum = "geri-cekildi"; talep.olaylar.push({ zaman: Date.now(), metin: `${DUKKAN.ad} teklifini geri çekti.`, kim: "dukkan" }); TP.talepKaydet(talep); }
        } else {
          const d = dd(); delete d.teklifler[id]; ddYaz({ teklifler: d.teklifler });
        }
        TP.toast("Teklifin geri çekildi.");
        ciz();
      } }],
    });
  }
  function ekBilgi(id) {
    const sorular = ["Hasarlı bölgenin yakın plan fotoğrafı", "Aracın önden ve arkadan genel fotoğrafı", "Gösterge panelindeki arıza lambalarının fotoğrafı", "Şasi numarası (parça uyumu için)"];
    TP.modal({
      baslik: "Ek bilgi iste", alt: "Hazır sorular müşteriye SMS ve takip sayfası üzerinden iletilir; serbest mesajlaşma yoktur.",
      icerik: `<fieldset class="secenekler"><legend class="label">Ne istiyorsun?</legend>${sorular.map((s, i) => `<label><input type="checkbox" name="soru" value="${s}" ${i === 0 ? "checked" : ""}>${s}</label>`).join("")}</fieldset>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Gönder", sinif: "btn-primary", eylem: (dlg) => {
        const secilen = [...dlg.querySelectorAll("input[name=soru]:checked")].map((x) => x.value);
        if (!secilen.length) { TP.toast("En az bir soru seç.", { tur: "uyari" }); return false; }
        const t = gelenTalepler().find((x) => x.id === id);
        if (t && t.demo) {
          const talep = TP.talepGetir(id);
          talep.olaylar.push({ zaman: Date.now(), metin: `${DUKKAN.ad} ek bilgi istedi: ${secilen.join(", ").toLocaleLowerCase("tr")}.`, kim: "dukkan" });
          TP.talepKaydet(talep);
        }
        TP.toast("Sorun müşteriye iletildi. Yanıt gelince bildirim alacaksın.", { tur: "basari" });
        return undefined;
      } }],
    });
  }

  // ---------- Aktif iş eylemleri ----------
  // Demo talebinde gerçek akış (TP.akis), örnek işte panel durumu güncellenir
  function isGuncelle(i, akisFn, ornekDegisim) {
    if (i.demo) {
      const t = TP.talepGetir(i.id);
      akisFn(t);
      TP.talepKaydet(t);
    } else {
      const d = dd();
      d.isler[i.id] = { ...(d.isler[i.id] || {}), ...ornekDegisim };
      ddYaz({ isler: d.isler });
    }
    ciz();
  }
  const fotoSlotlari = (adlar) => `<div class="foto-slotlari">${adlar.map((y) => `<button type="button" class="foto-slot" aria-pressed="false" data-foto-slot>${TP.ikon("camera")}${y}</button>`).join("")}</div>`;
  const slotlarTamam = (kap) => [...kap.querySelectorAll("[data-foto-slot]")].every((b) => b.getAttribute("aria-pressed") === "true");
  const alanHata = (dlg, alan) => dlg.querySelector(`[data-alan="${alan}"]`).classList.add("has-error");
  const ust = (i) => `${esc(i.id)} · ${esc(TP.aracAdi(i.arac))} · ${esc(i.musteri)}`;

  function teslimModal(i) {
    const beklenen = i.demo ? i.talep.teslimKodu : null;
    TP.modal({
      baslik: "Aracı teslim al", alt: ust(i),
      icerik: `
        <div class="field" data-alan="kod"><label for="tk-kod">Müşterinin teslim kodu</label><input class="input kod-input tnum" id="tk-kod" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="····">
          <span class="field-error">Kod eşleşmedi. Müşterinin ekranındaki 4 haneli kodu gir.</span><span class="hint">${beklenen ? `Prototip: müşterinin ekranındaki kod <b class="tnum">${beklenen}</b>` : "Prototip: örnek işte herhangi 4 hane kabul edilir."}</span></div>
        <div class="field" data-alan="foto"><span class="label">Aracın 4 yönden fotoğrafı</span>${fotoSlotlari(["Ön", "Arka", "Sol yan", "Sağ yan"])}<span class="field-error">Dört yönün de fotoğrafını çek.</span><span class="hint">Prototip: fotoğraf çekimi dokunarak simüle edilir.</span></div>
        <div class="grid-2">
          <div class="field" data-alan="km"><label for="tk-km">Kilometre</label><input class="input tnum" id="tk-km" inputmode="numeric" placeholder="Örn. 48.250"><span class="field-error">Kilometreyi yaz.</span></div>
          <div class="field"><label for="tk-yakit">Yakıt seviyesi</label><select class="select" id="tk-yakit"><option>1/4</option><option selected>1/2</option><option>3/4</option><option>Dolu</option></select></div>
        </div>
        <p class="notice">${TP.ikon("shield-check")}<span>Bu kayıt olası bir anlaşmazlıkta iki tarafı da korur. Kayıttan sonra aracı inceleyip 24 saat içinde kesin fiyatı girmelisin.</span></p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Teslimi kaydet", sinif: "btn-primary", eylem: (dlg) => {
        const kod = dlg.querySelector("#tk-kod").value.replace(/\D/g, "");
        const km = sayiOku(dlg.querySelector("#tk-km").value);
        const hatalar = [];
        if (kod.length !== 4 || (beklenen && kod !== beklenen)) hatalar.push("kod");
        if (!slotlarTamam(dlg)) hatalar.push("foto");
        if (!km) hatalar.push("km");
        if (hatalar.length) { hatalar.forEach((a) => alanHata(dlg, a)); return false; }
        const yakit = dlg.querySelector("#tk-yakit").value;
        isGuncelle(i, (t) => TP.akis.aracTeslimAl(t, { km, yakit }), { asama: "dukkanda", kesinGirildi: false });
        TP.toast("Araç teslim alındı ve kayda geçti. Şimdi kesin fiyatı gir.", { tur: "basari" });
        return undefined;
      } }],
    });
  }
  function kesinModal(i) {
    const dlg = TP.modal({
      baslik: "Kesin fiyatı gir", alt: `${ust(i)} · Ön teklif ${TP.tl(i.tutar)}`,
      icerik: `
        <fieldset class="secenekler"><legend class="label">Aracı inceledin. Fiyat ne olacak?</legend>
          <label><input type="radio" name="kesin" value="ayni" checked>Ön teklif geçerli: <b>&nbsp;${TP.tl(i.tutar)}</b></label>
          <label><input type="radio" name="kesin" value="revize">Revize etmem gerekiyor</label>
        </fieldset>
        <div class="form-grid" id="revize-alan" hidden>
          <div class="field" data-alan="rtutar"><label for="rv-tutar">Yeni tutar (KDV dahil)</label><div class="input-group"><input class="input tnum" id="rv-tutar" inputmode="numeric"><span class="suffix">₺</span></div><span class="field-error">Ön tekliften farklı bir tutar yaz.</span></div>
          <div class="field" data-alan="gerekce"><label for="rv-gerekce">Gerekçe</label><textarea class="textarea" id="rv-gerekce" placeholder="Örn. Sökümde far bağlantı braketinin kırık olduğu görüldü; değişmesi gerekiyor."></textarea><span class="field-error">Gerekçeyi birkaç kelimeyle yaz.</span></div>
          <div class="field" data-alan="rfoto"><span class="label">Gerekçe fotoğrafı</span>${fotoSlotlari(["Fotoğraf ekle"])}<span class="field-error">Revize için fotoğraf zorunlu.</span></div>
          <p class="notice warn">${TP.ikon("triangle-alert")}<span>Revize hakkın <b>yalnızca bir kez</b>. Müşteri reddederse aracı ücretsiz geri teslim edersin; revizeler teklife sadakat oranını düşürür.</span></p>
        </div>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Müşteriye gönder", sinif: "btn-primary", eylem: (x) => {
        const revize = x.querySelector("input[name=kesin]:checked").value === "revize";
        let tutar = i.tutar, gerekce = "";
        if (revize) {
          tutar = sayiOku(x.querySelector("#rv-tutar").value);
          gerekce = x.querySelector("#rv-gerekce").value.trim();
          const hatalar = [];
          if (!tutar || tutar === i.tutar) hatalar.push("rtutar");
          if (gerekce.length < 10) hatalar.push("gerekce");
          if (!slotlarTamam(x.querySelector('[data-alan="rfoto"]'))) hatalar.push("rfoto");
          if (hatalar.length) { hatalar.forEach((a) => alanHata(x, a)); return false; }
        }
        isGuncelle(i, (t) => TP.akis.kesinFiyatGir(t, { tutar, gerekce }), { kesinGirildi: true, tutar });
        TP.toast(revize ? "Revize fiyat gerekçesiyle müşteriye gönderildi." : "Kesin fiyat müşteriye gönderildi.", { tur: "basari" });
        if (!i.demo) ornekMusteriTepkisi(i.id, { asama: "onarimda" }, `${i.id}: Müşteri kesin fiyatı onayladı ve ödedi (simülasyon). Onarıma başlayabilirsin.`);
        return undefined;
      } }],
    });
    dlg.querySelector(".secenekler").addEventListener("change", () => {
      dlg.querySelector("#revize-alan").hidden = dlg.querySelector("input[name=kesin]:checked").value !== "revize";
    });
    paraAlaniBagla(dlg.querySelector("#rv-tutar"));
  }
  // Örnek işlerde müşterinin tepkisi birkaç saniye sonra simüle edilir
  function ornekMusteriTepkisi(id, degisim, mesaj) {
    setTimeout(() => {
      const d = dd();
      d.isler[id] = { ...(d.isler[id] || {}), ...degisim };
      ddYaz({ isler: d.isler });
      ciz();
      TP.toast(mesaj, { tur: "basari" });
    }, 2500);
  }
  function ilerlemeModal(i) {
    TP.modal({
      baslik: "İlerleme ekle", alt: `${ust(i)} · Müşteri takip sayfasında görür`,
      icerik: `<div class="field" data-alan="metin"><label for="il-metin">Ne yapıldı?</label><input class="input" id="il-metin" placeholder="Örn. Astar atıldı, boya fırınında"><span class="field-error">Kısa bir açıklama yaz.</span></div>
        <div class="field"><span class="label">Fotoğraf <span class="opt">İsteğe bağlı</span></span>${fotoSlotlari(["Fotoğraf ekle"])}</div>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Paylaş", sinif: "btn-primary", eylem: (x) => {
        const metin = x.querySelector("#il-metin").value.trim();
        if (metin.length < 3) { alanHata(x, "metin"); return false; }
        isGuncelle(i, (t) => TP.akis.ilerlemeEkle(t, metin), {});
        TP.toast("İlerleme müşteriyle paylaşıldı.", { tur: "basari" });
        return undefined;
      } }],
    });
  }
  function ekIsModal(i) {
    const dlg = TP.modal({
      baslik: "Ek iş talebi", alt: `${ust(i)} · Müşteri onaylamadan ek iş yapılamaz`,
      icerik: `<div class="field" data-alan="etutar"><label for="ek-tutar">Ek tutar (KDV dahil)</label><div class="input-group"><input class="input tnum" id="ek-tutar" inputmode="numeric" placeholder="Örn. 650"><span class="suffix">₺</span></div><span class="field-error">Tutarı yaz.</span></div>
        <div class="field" data-alan="eaciklama"><label for="ek-aciklama">Gerekçe</label><textarea class="textarea" id="ek-aciklama" placeholder="Örn. Sağ sis farı çerçevesi kırık çıktı; değişmesini öneriyoruz."></textarea><span class="field-error">Gerekçeyi yaz.</span></div>
        <div class="field" data-alan="efoto"><span class="label">Fotoğraf</span>${fotoSlotlari(["Fotoğraf ekle"])}<span class="field-error">Ek iş için fotoğraf zorunlu.</span></div>
        <p class="notice">${TP.ikon("lock")}<span>Müşteri onaylarsa ek tutar ayrıca tahsil edilir ve güvencede tutulur. Platform dışında ek ücret istenemez.</span></p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Müşteriye gönder", sinif: "btn-primary", eylem: (x) => {
        const tutar = sayiOku(x.querySelector("#ek-tutar").value), aciklama = x.querySelector("#ek-aciklama").value.trim();
        const hatalar = [];
        if (!tutar) hatalar.push("etutar");
        if (aciklama.length < 5) hatalar.push("eaciklama");
        if (!slotlarTamam(x.querySelector('[data-alan="efoto"]'))) hatalar.push("efoto");
        if (hatalar.length) { hatalar.forEach((a) => alanHata(x, a)); return false; }
        isGuncelle(i, (t) => TP.akis.ekIsTalep(t, { tutar, aciklama }), { ekIs: { durum: "bekliyor", tutar } });
        TP.toast("Ek iş talebi müşteriye gönderildi.", { tur: "basari" });
        if (!i.demo) ornekMusteriTepkisi(i.id, { ekIs: { durum: "onaylandi", tutar }, tutar: i.tutar + tutar }, `${i.id}: Müşteri ek işi onayladı, ek ödeme güvenceye alındı (simülasyon).`);
        return undefined;
      } }],
    });
    paraAlaniBagla(dlg.querySelector("#ek-tutar"));
  }
  function tamamlaModal(i) {
    if (i.ekIs && i.ekIs.durum === "bekliyor") { TP.toast("Önce müşterinin ek iş talebine yanıt vermesini bekle.", { tur: "uyari" }); return; }
    TP.modal({
      baslik: "Onarımı tamamla", alt: `${ust(i)} · Müşteriye SMS gider`,
      icerik: `<div class="field" data-alan="sfoto"><span class="label">Onarım sonrası fotoğraflar</span>${fotoSlotlari(["Onarılan bölge", "Genel görünüm"])}<span class="field-error">İki fotoğraf da gerekli.</span></div>
        <div class="field" data-alan="fatura"><label for="tm-fatura">e-Arşiv / e-Fatura numarası</label><input class="input tnum" id="tm-fatura" placeholder="Örn. GIB2026000123456"><span class="field-error">Fatura numarasını yaz; fatura yüklenmeden tamamlama bildirilemez.</span></div>
        <div class="field"><span class="label">Fatura PDF'i</span>${fotoSlotlari(["Fatura yükle"])}</div>
        <p class="notice">${TP.ikon("hand-coins")}<span>Müşteri aracı teslim alıp onay verdiğinde (ya da 72 saat içinde sorun bildirmezse) ${TP.tl(i.tutar * (1 - TP.KOMISYON))} net hakedişin hesabına aktarılır.</span></p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Tamamlandı olarak bildir", sinif: "btn-primary", eylem: (x) => {
        const faturaNo = x.querySelector("#tm-fatura").value.trim();
        const hatalar = [];
        if (!slotlarTamam(x.querySelector('[data-alan="sfoto"]'))) hatalar.push("sfoto");
        if (faturaNo.length < 6) hatalar.push("fatura");
        if (hatalar.length) { hatalar.forEach((a) => alanHata(x, a)); return false; }
        isGuncelle(i, (t) => TP.akis.onarimTamamla(t, { faturaNo }), { asama: "onay", teslimAlma: null });
        TP.toast("Onarım tamamlandı olarak bildirildi. Müşteriye SMS gönderildi.", { tur: "basari" });
        return undefined;
      } }],
    });
  }
  function teslimEtModal(i) {
    const beklenen = i.demo ? i.talep.teslimAlmaKodu : null;
    TP.modal({
      baslik: "Aracı müşteriye teslim et", alt: ust(i),
      icerik: `<div class="field" data-alan="kod"><label for="te-kod">Müşterinin teslim alma kodu</label><input class="input kod-input tnum" id="te-kod" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="····">
          <span class="field-error">Kod eşleşmedi.</span><span class="hint">${beklenen ? `Prototip: müşterinin ekranındaki kod <b class="tnum">${beklenen}</b>` : "Prototip: örnek işte herhangi 4 hane kabul edilir."}</span></div>
        <p class="notice">${TP.ikon("timer")}<span>Kod girildiğinde 72 saatlik onay süresi başlar. Müşteri bu sürede sorun bildirmezse ödeme otomatik onaylanır.</span></p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Teslimi kaydet", sinif: "btn-primary", eylem: (x) => {
        const kod = x.querySelector("#te-kod").value.replace(/\D/g, "");
        if (kod.length !== 4 || (beklenen && kod !== beklenen)) { alanHata(x, "kod"); return false; }
        isGuncelle(i, (t) => TP.akis.aracTeslimEt(t), { teslimAlma: Date.now() });
        TP.toast("Araç teslim edildi. 72 saatlik onay süresi başladı.", { tur: "basari" });
        return undefined;
      } }],
    });
  }
  function itirazModal(i) {
    const it = i.demo ? i.talep.itiraz : { neden: "İşçilik kalitesi", aciklama: "-" };
    TP.modal({
      baslik: "Çözüm öner", alt: `${ust(i)} · 48 saat içinde yanıt ver`,
      icerik: `<p class="gerekce"><b>Müşterinin bildirimi:</b> ${esc(it.neden)}: “${esc(it.aciklama)}”</p>
        <fieldset class="secenekler"><legend class="label">Önerin</legend>
          <label><input type="radio" name="oneri" value="duzeltme" checked>Ücretsiz düzeltme</label>
          <label><input type="radio" name="oneri" value="iade">Kısmi iade</label>
        </fieldset>
        <div class="field" data-alan="oneri"><label for="oneri-metin">Müşteriye açıklama</label><textarea class="textarea" id="oneri-metin">Aracı yeniden kontrol edip bildirdiğin sorunu ücretsiz düzelteceğiz. İşlem 1 iş günü sürer.</textarea><span class="field-error">Açıklama yaz.</span></div>
        <p class="notice">${TP.ikon("scale")}<span>Müşteri kabul etmezse TamirPort arabuluculuk yapar; gerekirse bağımsız eksper görüşü alınır.</span></p>`,
      butonlar: [{ metin: "Vazgeç" }, { metin: "Öneriyi gönder", sinif: "btn-primary", eylem: (x) => {
        const metin = x.querySelector("#oneri-metin").value.trim();
        if (metin.length < 5) { alanHata(x, "oneri"); return false; }
        isGuncelle(i, (t) => {
          t.itiraz.oneri = metin;
          t.itiraz.oneriTuru = x.querySelector("input[name=oneri]:checked").value;
          t.olaylar.push({ zaman: Date.now(), metin: `${DUKKAN.ad} çözüm önerdi: ${metin}`, kim: "dukkan" });
        }, {});
        TP.toast("Önerin müşteriye iletildi.", { tur: "basari" });
        return undefined;
      } }],
    });
  }

  // ---------- Çizim ve olaylar ----------
  function aktifGorunum() { const h = location.hash.replace("#", ""); return GORUNUMLER[h] ? h : "ozet"; }
  function ciz() {
    const g = aktifGorunum();
    $("#gorunum-baslik").textContent = GORUNUMLER[g][0];
    $("#gorunum-alt").textContent = GORUNUMLER[g][1];
    $$("[data-gorunum]").forEach((a) => { if (a.dataset.gorunum === g) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const diger = $("[data-diger-menu]");
    if (["teklifler", "degerlendirmeler", "profil"].includes(g)) diger.setAttribute("aria-current", "page"); else diger.removeAttribute("aria-current");
    $("#gorunum").innerHTML = { ozet: ozetGorunumu, talepler: taleplerGorunumu, teklifler: tekliflerGorunumu, isler: islerGorunumu, hakedis: hakedisGorunumu, degerlendirmeler: degerlendirmelerGorunumu, profil: profilGorunumu }[g]();
    $('[data-sayac="talepler"]').textContent = gelenTalepler().filter((t) => !benimTeklifim(t)).length || "";
    $('[data-sayac="isler"]').textContent = isleriTopla().filter(aksiyonGerekli).length || "";
    $("#teklif-acik").checked = dd().acik;
  }
  function olaylariBagla() {
    document.addEventListener("click", (e) => {
      const b = (s) => e.target.closest(s);
      let el;
      if ((el = b("[data-teklif-ver]"))) teklifFormu(el.dataset.teklifVer);
      else if ((el = b("[data-geri-cek]"))) geriCek(el.dataset.geriCek);
      else if ((el = b("[data-ek-bilgi]"))) ekBilgi(el.dataset.ekBilgi);
      else if ((el = b("[data-talep-kat]"))) { talepFiltre.kategori = el.dataset.talepKat; ciz(); }
      else if ((el = b("[data-teklif-sekme]"))) { teklifSekme = el.dataset.teklifSekme; ciz(); }
      else if ((el = b("[data-is]"))) {
        const i = isleriTopla().find((x) => x.id === el.dataset.is);
        if (i) ({ teslim: teslimModal, kesin: kesinModal, ilerleme: ilerlemeModal, ekis: ekIsModal, tamamla: tamamlaModal, teslimet: teslimEtModal, itiraz: itirazModal })[el.dataset.eylem](i);
      }
      else if ((el = b("[data-foto-slot]"))) {
        const acik = el.getAttribute("aria-pressed") === "true";
        el.setAttribute("aria-pressed", String(!acik));
        el.lastChild.textContent = acik ? el.lastChild.textContent.replace(" ✓", "") : el.lastChild.textContent + " ✓";
        el.closest(".field")?.classList.remove("has-error");
      }
      else if ((el = b("[data-profil-kat]"))) {
        const d = dd();
        const k = el.dataset.profilKat;
        const yeni = d.kategoriler.includes(k) ? d.kategoriler.filter((x) => x !== k) : [...d.kategoriler, k];
        if (!yeni.length) { TP.toast("En az bir kategori seçili kalmalı.", { tur: "uyari" }); return; }
        ddYaz({ kategoriler: V.kategoriler.map((x) => x.id).filter((x) => yeni.includes(x)) });
        ciz();
        TP.toast("Kategorilerin güncellendi. Gelen talepler buna göre filtrelenir.", { tur: "basari" });
      }
      else if ((el = b("[data-yanitla]"))) {
        const yer = $(`[data-yanit-alan="${el.dataset.yanitla}"]`);
        yer.innerHTML = `<div class="field"><label class="gizli-metin" for="yanit-${el.dataset.yanitla}">Yanıtın</label><textarea class="textarea" id="yanit-${el.dataset.yanitla}" maxlength="400" placeholder="Teşekkürler, tekrar bekleriz."></textarea></div><div class="btn-row"><button type="button" class="btn btn-primary btn-sm" data-yanit-gonder="${el.dataset.yanitla}">Yanıtı yayınla</button><span class="hint">Her yoruma yalnızca bir kez yanıt verebilirsin.</span></div>`;
        yer.querySelector("textarea").focus();
      }
      else if ((el = b("[data-yanit-gonder]"))) {
        const metin = $(`#yanit-${el.dataset.yanitGonder}`).value.trim();
        if (!metin) { TP.toast("Yanıt metni boş olamaz.", { tur: "uyari" }); return; }
        const d = dd(); d.yanitlar[el.dataset.yanitGonder] = metin; ddYaz({ yanitlar: d.yanitlar });
        ciz();
        TP.toast("Yanıtın yayınlandı.", { tur: "basari" });
      }
      else if ((el = b("[data-git]"))) location.hash = el.dataset.git;
      else if (b("[data-diger-menu]")) {
        TP.modal({
          baslik: "Menü",
          icerik: `<nav class="app-nav">${[["teklifler", "send", "Tekliflerim"], ["degerlendirmeler", "star", "Değerlendirmeler"], ["profil", "settings", "Profil ve ayarlar"]].map(([h, ik, ad]) => `<a href="#${h}" data-kapat>${TP.ikon(ik)}${ad}</a>`).join("")}<a href="index.html">${TP.ikon("house")}Ana sayfa</a></nav>`,
        });
      }
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "talep-sirala") { talepFiltre.sirala = e.target.value; ciz(); }
      if (e.target.id === "sadece-bekleyen") { talepFiltre.sadeceBekleyen = e.target.checked; ciz(); }
      if (e.target.id === "teklif-acik") {
        ddYaz({ acik: e.target.checked });
        TP.toast(e.target.checked ? "Teklif almaya açıksın. Yeni talepler sana düşer." : "Teklif almaya kapattın. Yeni talepler sana düşmez.", { tur: e.target.checked ? "basari" : "uyari" });
        ciz();
      }
      if (e.target.id === "yaricap") ddYaz({ yaricap: Number(e.target.value) });
    });
    document.addEventListener("input", (e) => {
      if (e.target.id === "yaricap") $("#yaricap-deger").textContent = e.target.value + " km";
    });
    addEventListener("hashchange", () => { ciz(); window.scrollTo(0, 0); });
  }

  function demoCiz(panel) {
    panel.innerHTML = `<h2>Prototip kontrolleri</h2>
      <p>Bu panel "${esc(DUKKAN.ad)}" olarak açık. Ana sayfadan oluşturduğun talep, kategorisi uyarsa Gelen talepler'e düşer; teklifin müşterinin sayfasına gider.</p>
      <div class="demo-group"><span>Müşteri tarafı</span><div class="demo-buttons"><button type="button" data-demo="talep">Teklif takip sayfası</button><button type="button" data-demo="form">Yeni talep oluştur</button></div></div>
      <div class="demo-group"><span>Demo verisi</span><div class="demo-buttons"><button type="button" data-demo="panel-sifirla">Panel örneklerini sıfırla</button><button type="button" data-demo="sifirla">Tüm demo verisini sil</button></div></div>`;
    panel.onclick = (e) => {
      const b = e.target.closest("[data-demo]");
      if (!b) return;
      if (b.dataset.demo === "talep") location.href = "talep.html";
      if (b.dataset.demo === "form") location.href = "index.html#teklif-al";
      if (b.dataset.demo === "panel-sifirla") { ddYaz({ teklifler: {}, isler: {}, yanitlar: {}, kategoriler: DUKKAN.kategoriler.slice(), acik: true, yaricap: 15 }); ciz(); TP.toast("Panel örnekleri sıfırlandı."); }
      if (b.dataset.demo === "sifirla") { TP.sifirla(); location.reload(); }
    };
  }

  TP.sayfaKur(() => {
    $("#yan-dukkan").innerHTML = `<div class="profil-ust">${TP.dukkanLogo(DUKKAN, "kucuk")}<div><h3>${esc(DUKKAN.ad)}</h3><p>${esc(DUKKAN.ilce)}, ${esc(DUKKAN.il)}</p></div></div>${TP.puanRozet(DUKKAN.puan, DUKKAN.degerlendirme)}<span><span class="badge badge-tq">${TP.ikon("badge-check")}Anlaşmalı firma</span></span>`;
    $("#ust-logo").innerHTML = TP.dukkanLogo(DUKKAN, "kucuk");
    olaylariBagla();
    ciz();
    TP.demoPanel(demoCiz);
    TP.degisinceDinle(ciz);
    // Geri sayımlar ve otomatik onay süreleri dakikada bir tazelenir
    setInterval(() => { if (!document.querySelector("dialog[open]")) ciz(); }, 60000);
  });
})();
