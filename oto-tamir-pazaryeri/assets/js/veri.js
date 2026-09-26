// Prototipin örnek verileri: kategoriler, araçlar, il/ilçeler, dükkanlar, yorumlar, rehber içerikleri
// ve bir talebe gelen otomatik tekliflerin üretimi. Tüm firma, puan ve fiyatlar örnektir.
(function () {
  const V = {};

  V.kategoriler = [
    { id: "kaporta", ad: "Kaporta", ikon: "hammer", ozet: "Göçük, ezik, parça değişimi" },
    { id: "boya", ad: "Boya", ikon: "spray-can", ozet: "Lokal ve komple boya, pasta-cila" },
    { id: "mekanik", ad: "Mekanik", ikon: "cog", ozet: "Motor, şanzıman, fren, süspansiyon" },
    { id: "elektrik", ad: "Elektrik", ikon: "zap", ozet: "Akü, marş, aydınlatma, beyin" },
    { id: "doseme", ad: "Döşeme", ikon: "armchair", ozet: "Koltuk, tavan, kapı döşemesi" },
  ];
  V.kategori = (id) => V.kategoriler.find((k) => k.id === id);

  // sinif: fiyat katsayısı için (premium parçalar daha pahalı)
  V.markalar = [
    { ad: "Audi", sinif: "premium", modeller: ["A3", "A4", "A5", "A6", "Q2", "Q3", "Q5", "Q7"], paketler: ["Dynamic", "Design", "Advanced", "S line"] },
    { ad: "BMW", sinif: "premium", modeller: ["1 Serisi", "2 Serisi", "3 Serisi", "4 Serisi", "5 Serisi", "X1", "X3", "X5"], paketler: ["Standart", "Sport Line", "Luxury Line", "M Sport"] },
    { ad: "Citroën", sinif: "orta", modeller: ["C3", "C4", "C4 X", "C5 Aircross", "C-Elysée", "Berlingo"], paketler: ["Feel", "Feel Bold", "Shine", "Shine Bold"] },
    { ad: "Dacia", sinif: "ekonomik", modeller: ["Sandero", "Sandero Stepway", "Logan", "Duster", "Jogger"], paketler: ["Essential", "Expression", "Extreme", "Journey"] },
    { ad: "Fiat", sinif: "ekonomik", modeller: ["Egea Sedan", "Egea Cross", "Egea Hatchback", "Doblo", "Fiorino", "500"], paketler: ["Easy", "Urban", "Lounge", "Limited"] },
    { ad: "Ford", sinif: "orta", modeller: ["Fiesta", "Focus", "Puma", "Kuga", "Courier", "Tourneo Connect"], paketler: ["Trend", "Titanium", "ST-Line", "Active"] },
    { ad: "Honda", sinif: "orta", modeller: ["City", "Civic", "Jazz", "HR-V", "CR-V"], paketler: ["Elegance", "Executive", "Executive+", "Advance"] },
    { ad: "Hyundai", sinif: "orta", modeller: ["i10", "i20", "Bayon", "Elantra", "Tucson", "Kona"], paketler: ["Jump", "Style", "Elite", "Prime"] },
    { ad: "Kia", sinif: "orta", modeller: ["Picanto", "Rio", "Ceed", "Stonic", "Sportage"], paketler: ["Cool", "Elegance", "Prestige", "GT-Line"] },
    { ad: "Mercedes-Benz", sinif: "premium", modeller: ["A Serisi", "C Serisi", "E Serisi", "CLA", "GLA", "GLC", "Vito"], paketler: ["Style", "Progressive", "AMG Line", "Exclusive"] },
    { ad: "Nissan", sinif: "orta", modeller: ["Micra", "Juke", "Qashqai", "X-Trail"], paketler: ["Visia", "Tekna", "Platinum", "N-Design"] },
    { ad: "Opel", sinif: "orta", modeller: ["Corsa", "Astra", "Mokka", "Crossland", "Grandland"], paketler: ["Edition", "Elegance", "GS", "Ultimate"] },
    { ad: "Peugeot", sinif: "orta", modeller: ["208", "2008", "308", "3008", "408", "Rifter"], paketler: ["Active", "Allure", "GT", "GT Line"] },
    { ad: "Renault", sinif: "ekonomik", modeller: ["Clio", "Megane Sedan", "Taliant", "Captur", "Austral", "Symbol"], paketler: ["Joy", "Touch", "Icon", "Evolution", "Techno"] },
    { ad: "Seat", sinif: "orta", modeller: ["Ibiza", "Leon", "Arona", "Ateca"], paketler: ["Style", "Xcellence", "FR"] },
    { ad: "Skoda", sinif: "orta", modeller: ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq"], paketler: ["Elite", "Premium", "Prestige", "Sportline"] },
    { ad: "Tesla", sinif: "premium", modeller: ["Model 3", "Model Y"], paketler: ["Standart", "Long Range", "Performance"] },
    { ad: "Togg", sinif: "premium", modeller: ["T10X", "T10F"], paketler: ["V1", "V2"] },
    { ad: "Toyota", sinif: "orta", modeller: ["Yaris", "Yaris Cross", "Corolla", "C-HR", "RAV4"], paketler: ["Vision", "Dream", "Flame", "Passion"] },
    { ad: "Volkswagen", sinif: "orta", modeller: ["Polo", "Golf", "Passat", "T-Roc", "Tiguan", "Caddy"], paketler: ["Impression", "Life", "Style", "R-Line"] },
    { ad: "Volvo", sinif: "premium", modeller: ["S60", "S90", "XC40", "XC60", "XC90"], paketler: ["Core", "Plus", "Ultimate"] },
  ];
  V.marka = (ad) => V.markalar.find((m) => m.ad === ad);
  V.PAKET_BILMIYORUM = "Bilmiyorum / emin değilim";

  V.populerIller = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Kocaeli"];
  V.iller = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
    "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
    "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
    "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
    "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir",
    "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
    "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas",
    "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
  ];
  V.ilceler = {
    "İstanbul": ["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"],
    "Ankara": ["Altındağ", "Çankaya", "Etimesgut", "Gölbaşı", "Keçiören", "Mamak", "Polatlı", "Pursaklar", "Sincan", "Yenimahalle"],
    "İzmir": ["Balçova", "Bayraklı", "Bornova", "Buca", "Çiğli", "Gaziemir", "Karabağlar", "Karşıyaka", "Konak", "Menemen", "Narlıdere", "Torbalı"],
    "Bursa": ["Gemlik", "İnegöl", "Mudanya", "Nilüfer", "Osmangazi", "Yıldırım"],
    "Antalya": ["Alanya", "Kepez", "Konyaaltı", "Manavgat", "Muratpaşa"],
    "Kocaeli": ["Başiskele", "Darıca", "Gebze", "Gölcük", "İzmit", "Kartepe", "Körfez"],
  };
  V.ilceleriGetir = (il) => V.ilceler[il] || ["Merkez"];

  // ton: monogram rengi (temel.css .shop-logo[data-ton])
  V.dukkanlar = [
    { id: "d1", ad: "Turkuaz Kaporta & Boya", kisa: "TK", ton: 0, il: "İstanbul", ilce: "Kadıköy", kategoriler: ["kaporta", "boya"], puan: 4.9, degerlendirme: 312, tamamlanan: 1240, sadakat: 97, yanitDk: 18, garantiAy: 12, kurulus: 2009, sahibi: "Murat Aydın", adres: "Hasanpaşa Mah. Kurbağalıdere Cad. No: 42", tel: "0216 000 00 42", saatler: "Hafta içi 08:30–19:00 · Cumartesi 09:00–16:00", kriterler: { iscilik: 4.9, fiyat: 4.8, zaman: 4.9, iletisim: 5.0 }, anlasmali: true },
    { id: "d2", ad: "Usta Garaj Oto Servis", kisa: "UG", ton: 2, il: "İstanbul", ilce: "Ataşehir", kategoriler: ["mekanik", "elektrik"], puan: 4.8, degerlendirme: 428, tamamlanan: 1905, sadakat: 95, yanitDk: 25, garantiAy: 6, kurulus: 2012, sahibi: "Serkan Öz", adres: "Barbaros Mah. Hal Yolu Cad. No: 18", tel: "0216 000 00 18", saatler: "Hafta içi 08:00–19:00 · Cumartesi 09:00–15:00", kriterler: { iscilik: 4.8, fiyat: 4.7, zaman: 4.8, iletisim: 4.9 }, anlasmali: true },
    { id: "d3", ad: "Anadolu Oto Elektrik", kisa: "AE", ton: 1, il: "İstanbul", ilce: "Ümraniye", kategoriler: ["elektrik"], puan: 4.7, degerlendirme: 196, tamamlanan: 760, sadakat: 96, yanitDk: 32, garantiAy: 6, kurulus: 2015, sahibi: "Hakan Er", adres: "Dudullu OSB 2. Cad. No: 7", tel: "0216 000 00 07", saatler: "Hafta içi 08:30–18:30", kriterler: { iscilik: 4.7, fiyat: 4.8, zaman: 4.6, iletisim: 4.7 }, anlasmali: true },
    { id: "d4", ad: "Moda Döşeme Atölyesi", kisa: "MD", ton: 3, il: "İstanbul", ilce: "Üsküdar", kategoriler: ["doseme"], puan: 4.9, degerlendirme: 141, tamamlanan: 520, sadakat: 98, yanitDk: 45, garantiAy: 24, kurulus: 2006, sahibi: "Nuri Kaya", adres: "Bulgurlu Mah. Libadiye Cad. No: 63", tel: "0216 000 00 63", saatler: "Hafta içi 09:00–18:00 · Cumartesi 10:00–15:00", kriterler: { iscilik: 5.0, fiyat: 4.7, zaman: 4.8, iletisim: 4.9 }, anlasmali: true },
    { id: "d5", ad: "Kartal Mekanik Merkezi", kisa: "KM", ton: 0, il: "İstanbul", ilce: "Kartal", kategoriler: ["mekanik"], puan: 4.6, degerlendirme: 233, tamamlanan: 980, sadakat: 92, yanitDk: 22, garantiAy: 6, kurulus: 2011, sahibi: "Cem Tunç", adres: "Yakacık Sanayi Sitesi C Blok No: 12", tel: "0216 000 00 12", saatler: "Hafta içi 08:00–18:30 · Cumartesi 08:30–14:00", kriterler: { iscilik: 4.7, fiyat: 4.6, zaman: 4.4, iletisim: 4.6 }, anlasmali: true },
    { id: "d6", ad: "Boyahane Maltepe", kisa: "BM", ton: 1, il: "İstanbul", ilce: "Maltepe", kategoriler: ["boya", "kaporta"], puan: 4.8, degerlendirme: 207, tamamlanan: 845, sadakat: 94, yanitDk: 28, garantiAy: 12, kurulus: 2014, sahibi: "Oğuz Şen", adres: "Esenkent Mah. Sanayi Cad. No: 9", tel: "0216 000 00 09", saatler: "Hafta içi 08:30–19:00", kriterler: { iscilik: 4.9, fiyat: 4.7, zaman: 4.7, iletisim: 4.8 }, anlasmali: true },
    { id: "d7", ad: "Kalamış Oto Kaporta", kisa: "KO", ton: 2, il: "İstanbul", ilce: "Kadıköy", kategoriler: ["kaporta"], puan: 4.5, degerlendirme: 98, tamamlanan: 410, sadakat: 90, yanitDk: 40, garantiAy: 6, kurulus: 2017, sahibi: "Emre Kılıç", adres: "Fikirtepe Mah. Mandıra Cad. No: 21", tel: "0216 000 00 21", saatler: "Hafta içi 09:00–18:30", kriterler: { iscilik: 4.6, fiyat: 4.5, zaman: 4.3, iletisim: 4.5 }, anlasmali: false },
    { id: "d8", ad: "Levent Premium Oto", kisa: "LP", ton: 2, il: "İstanbul", ilce: "Beşiktaş", kategoriler: ["kaporta", "boya", "mekanik"], puan: 4.8, degerlendirme: 365, tamamlanan: 1510, sadakat: 96, yanitDk: 15, garantiAy: 24, kurulus: 2008, sahibi: "Kerem Aslan", adres: "Levent Mah. Sanayi Sok. No: 4", tel: "0212 000 00 04", saatler: "Hafta içi 08:00–20:00 · Cumartesi 09:00–17:00", kriterler: { iscilik: 4.9, fiyat: 4.5, zaman: 4.8, iletisim: 4.9 }, anlasmali: true },
    { id: "d9", ad: "Bağcılar Usta Mekanik", kisa: "BU", ton: 3, il: "İstanbul", ilce: "Bağcılar", kategoriler: ["mekanik", "elektrik"], puan: 4.4, degerlendirme: 156, tamamlanan: 690, sadakat: 88, yanitDk: 35, garantiAy: 6, kurulus: 2013, sahibi: "Yusuf Demir", adres: "Güneşli Oto Sanayi 3. Blok No: 30", tel: "0212 000 00 30", saatler: "Hafta içi 08:00–19:00 · Cumartesi 08:00–15:00", kriterler: { iscilik: 4.5, fiyat: 4.6, zaman: 4.2, iletisim: 4.3 }, anlasmali: false },
    { id: "d10", ad: "Şişli Oto Elektrik & Klima", kisa: "ŞE", ton: 0, il: "İstanbul", ilce: "Şişli", kategoriler: ["elektrik"], puan: 4.7, degerlendirme: 120, tamamlanan: 505, sadakat: 95, yanitDk: 20, garantiAy: 6, kurulus: 2016, sahibi: "Tolga Ay", adres: "Mecidiyeköy Mah. Oto Sanayi Sok. No: 11", tel: "0212 000 00 11", saatler: "Hafta içi 09:00–18:30", kriterler: { iscilik: 4.7, fiyat: 4.6, zaman: 4.8, iletisim: 4.7 }, anlasmali: true },
    { id: "d11", ad: "Beylikdüzü Oto Döşeme", kisa: "BD", ton: 1, il: "İstanbul", ilce: "Beylikdüzü", kategoriler: ["doseme"], puan: 4.6, degerlendirme: 74, tamamlanan: 280, sadakat: 93, yanitDk: 50, garantiAy: 12, kurulus: 2018, sahibi: "Sinan Uçar", adres: "Beylikdüzü OSB Mah. 12. Sok. No: 5", tel: "0212 000 00 05", saatler: "Hafta içi 09:00–18:00", kriterler: { iscilik: 4.7, fiyat: 4.6, zaman: 4.5, iletisim: 4.6 }, anlasmali: true },
    { id: "d12", ad: "Pendik Kaporta Boya Merkezi", kisa: "PK", ton: 3, il: "İstanbul", ilce: "Pendik", kategoriler: ["kaporta", "boya"], puan: 4.7, degerlendirme: 188, tamamlanan: 720, sadakat: 94, yanitDk: 26, garantiAy: 12, kurulus: 2012, sahibi: "Barış Koç", adres: "Kaynarca Mah. Sanayi Cad. No: 38", tel: "0216 000 00 38", saatler: "Hafta içi 08:30–19:00 · Cumartesi 09:00–14:00", kriterler: { iscilik: 4.8, fiyat: 4.7, zaman: 4.6, iletisim: 4.7 }, anlasmali: true },
    { id: "d13", ad: "Çankaya Oto Bakım", kisa: "ÇO", ton: 0, il: "Ankara", ilce: "Çankaya", kategoriler: ["mekanik", "elektrik", "kaporta"], puan: 4.8, degerlendirme: 210, tamamlanan: 880, sadakat: 95, yanitDk: 24, garantiAy: 12, kurulus: 2010, sahibi: "Ahmet Yurt", adres: "Balgat Mah. Sanayi Sok. No: 14", tel: "0312 000 00 14", saatler: "Hafta içi 08:30–18:30 · Cumartesi 09:00–14:00", kriterler: { iscilik: 4.8, fiyat: 4.7, zaman: 4.8, iletisim: 4.8 }, anlasmali: true },
    { id: "d14", ad: "Bornova Boya & Kaporta", kisa: "BB", ton: 1, il: "İzmir", ilce: "Bornova", kategoriler: ["kaporta", "boya"], puan: 4.7, degerlendirme: 164, tamamlanan: 610, sadakat: 93, yanitDk: 30, garantiAy: 12, kurulus: 2013, sahibi: "Levent Ege", adres: "Işıkkent Oto Sanayi 1. Blok No: 22", tel: "0232 000 00 22", saatler: "Hafta içi 08:30–18:30", kriterler: { iscilik: 4.8, fiyat: 4.7, zaman: 4.6, iletisim: 4.7 }, anlasmali: true },
  ];
  V.dukkan = (id) => V.dukkanlar.find((d) => d.id === id);
  V.DEMO_DUKKAN = "d1"; // Dükkan panelinde oturum açmış örnek dükkan

  V.yorumlar = [
    { ad: "Selin K.", arac: "Renault Clio · Boya", puan: 5, gunOnce: 4, metin: "Teklifte yazan fiyata yaptılar, renk tonu birebir tuttu. Teslim bir gün erkene alındı." },
    { ad: "Emre T.", arac: "Volkswagen Passat · Kaporta", puan: 5, gunOnce: 9, metin: "Aracı teslim ederken çekilen fotoğraflar içimi rahatlattı. Ödemeyi onaylamadan önce her şeyi kontrol edebildim." },
    { ad: "Ayşe D.", arac: "Toyota Corolla · Mekanik", puan: 4, gunOnce: 13, metin: "İşçilik iyi, yalnızca parça bir gün geç geldi. Gecikmeyi platformdan önceden bildirdiler." },
    { ad: "Burak Y.", arac: "BMW 3 Serisi · Kaporta, Boya", puan: 5, gunOnce: 17, metin: "Revize gerekmedi, ön teklif neyse o ödendi. Çamurluk fabrika çıkışı gibi oldu." },
    { ad: "Deniz A.", arac: "Fiat Egea · Elektrik", puan: 4, gunOnce: 22, metin: "Arızayı hızlı buldular. Bekleme alanı küçük ama iletişim çok iyiydi." },
    { ad: "Mert Ç.", arac: "Hyundai i20 · Döşeme", puan: 5, gunOnce: 30, metin: "Koltuk döşemesi orijinal gibi oldu, iki yıl garanti verdiler." },
  ];

  V.makaleler = [
    {
      id: "karsilastirma", etiket: "Genel", ikon: "scale", sure: 4, desen: "cizgi",
      baslik: "Teklifleri karşılaştırırken yalnızca fiyata bakma",
      ozet: "Parça türü, garanti süresi, teslim tarihi ve teklife sadakat oranı fiyat kadar önemlidir.",
      icerik: `<p>İki teklif arasındaki fark çoğu zaman parçanın türünden gelir. Orijinal parçayla verilen teklif, muadil ya da çıkma parçayla verilen tekliften pahalı olur. Karşılaştırmayı aynı parça türünde yapmaya çalış.</p>
        <ul><li><b>Parça türü:</b> Orijinal, muadil (yan sanayi) ve çıkma parçanın garantisi ve ömrü farklıdır.</li>
        <li><b>İşçilik garantisi:</b> 6 ay ile 24 ay arasındaki fark, ileride çıkabilecek bir sorunda seni korur.</li>
        <li><b>Teslim süresi:</b> Aracı kaç gün kullanamayacağını hesaba kat.</li>
        <li><b>Teklife sadakat:</b> Dükkanın işlerinin yüzde kaçını teklif ettiği fiyata bitirdiğini gösterir. Düşük oran, sürpriz fiyat riskine işaret eder.</li></ul>
        <p>Önerilen sıralama bu ölçütleri birlikte değerlendirir. Yine de karar senin: fiyata, puana ya da mesafeye göre sıralayabilirsin.</p>`,
    },
    {
      id: "teslim-fotograf", etiket: "Genel", ikon: "camera", sure: 3, desen: "nokta",
      baslik: "Aracını teslim etmeden önce fotoğraflarını çek",
      ozet: "Dört yönden fotoğraf, kilometre ve yakıt seviyesi olası bir anlaşmazlıkta en güçlü kanıttır.",
      icerik: `<p>Teslim anında dükkan da aracın fotoğraflarını sisteme yükler; yine de kendi fotoğraflarını çekmek iki taraf için de işi kolaylaştırır.</p>
        <ul><li>Aracın önünü, arkasını ve iki yanını gün ışığında çek.</li>
        <li>Gösterge panelinden kilometreyi ve yakıt seviyesini kaydet.</li>
        <li>Değerli eşyalarını, otopark kartını ve yedek anahtarı araçta bırakma.</li>
        <li>Mevcut çizik ve göçükleri teslim formunda dükkanla birlikte işaretle.</li></ul>`,
    },
    {
      id: "parca-turleri", etiket: "Kaporta", ikon: "package", sure: 5, desen: "izgara",
      baslik: "Orijinal, muadil ve çıkma parça arasındaki fark",
      ozet: "Hangi durumda hangi parçayı seçmeli? Garanti, fiyat ve ikinci el değeri açısından farklar.",
      icerik: `<p><b>Orijinal parça</b> aracın üreticisinin logosunu taşır; uyumu ve garantisi en yüksektir, fiyatı da öyle.</p>
        <p><b>Muadil (OEM/yan sanayi) parça</b> aynı teknik ölçülere göre başka üreticilerce yapılır. Kaliteli markalarda uyum sorunu yaşanmaz ve fiyat avantajı belirgindir.</p>
        <p><b>Çıkma parça</b> başka bir araçtan sökülmüş orijinal parçadır. Uygun fiyatlıdır ama geçmişi ve kalan ömrü bilinmez; garantisi genellikle sınırlıdır.</p>
        <p>Teklifte parça türü belirtilmek zorundadır. Yeni ve garantisi süren araçlarda orijinal parça, garanti koşulları açısından daha güvenlidir.</p>`,
    },
    {
      id: "boya-uyumu", etiket: "Boya", ikon: "spray-can", sure: 4, desen: "cizgi",
      baslik: "Boya işlerinde renk uyumu ve boya kalınlığı",
      ozet: "Renk kodu, geçişli boya, pasta-cila ve mikron ölçümü hakkında bilmen gerekenler.",
      icerik: `<p>Aynı renk kodu, aracın yaşına ve güneş görme süresine göre farklı tonlarda görünebilir. İyi bir boyacı, komşu parçalara geçiş yaparak (geçişli boya) ton farkını gizler.</p>
        <ul><li>Renk kodunu ruhsatta değil, genellikle kapı direğindeki etikette bulursun.</li>
        <li>Lokal boya küçük hasarlar için yeterlidir; tüm parçanın boyanması ekspertizde "boyalı" olarak görünür.</li>
        <li>Boya kalınlığı mikron ölçer ile ölçülür. Teslimde ölçüm sonuçlarını isteyebilirsin.</li>
        <li>Boyadan sonraki ilk birkaç hafta aracı fırçalı otomatik yıkamaya sokma.</li></ul>`,
    },
    {
      id: "hasar-kaydi", etiket: "Kaporta", ikon: "file-text", sure: 4, desen: "nokta",
      baslik: "Hasar kaydı ve aracının ikinci el değeri",
      ozet: "Sigortaya yansıyan hasar kaydı ve değişen/boyalı parça bilgisi satışta nasıl görünür?",
      icerik: `<p>Sigorta şirketine bildirilen hasarlar sistemde kayıt altına alınır ve aracın geçmişinde görünür. Cebinden ödediğin onarımlar bu kayda yansımaz, ancak ekspertiz raporunda değişen veya boyalı parça olarak görünür.</p>
        <ul><li>Onarım faturasını ve işlem detayını sakla; satışta şeffaflık güven verir.</li>
        <li>Değişen parçanın orijinal olup olmadığı ikinci el değerini etkiler.</li>
        <li>Platformdaki tamamlanmış işlerin fotoğraf ve faturaları hesabında saklanır.</li></ul>`,
    },
    {
      id: "elektrik-ilk", etiket: "Elektrik", ikon: "zap", sure: 3, desen: "izgara",
      baslik: "Elektrik arızalarında ilk kontroller",
      ozet: "Ustaya gitmeden önce akü, sigortalar ve arıza lambalarıyla ilgili yapabileceğin basit kontroller.",
      icerik: `<p>Elektrik arızalarının önemli bir kısmı akü ve bağlantılardan kaynaklanır. Talep açarken bu gözlemlerini açıklamaya yazman, dükkanların daha isabetli teklif vermesini sağlar.</p>
        <ul><li>Marş basmıyorsa ya da tık sesi geliyorsa akü ve kutup başlarını kontrol ettir.</li>
        <li>Belirli bir donanım çalışmıyorsa sigorta kutusundaki ilgili sigortaya bak.</li>
        <li>Gösterge panelinde yanan arıza lambalarının fotoğrafını çek.</li>
        <li>Araca su girdiyse aracı çalıştırmadan çekiciyle götürmek daha güvenlidir.</li></ul>`,
    },
  ];

  // ---------- Deterministik rastgelelik: aynı talep her açılışta aynı teklifleri üretir ----------
  V.rastgele = function (tohum) {
    let h = 1779033703 ^ String(tohum).length;
    for (const ch of String(tohum)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    const r = () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.aralik = (min, max) => min + r() * (max - min);
    r.tam = (min, max) => Math.floor(r.aralik(min, max + 1));
    r.sec = (dizi) => dizi[Math.floor(r() * dizi.length)];
    r.karistir = (dizi) => dizi.map((x) => [r(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
    return r;
  };

  // Kategori başına taban fiyat (₺, KDV dahil, orta sınıf araç) ve tahmini iş günü
  const TABAN = { kaporta: [7600, 3], boya: [6200, 2], mekanik: [8800, 2], elektrik: [4600, 1], doseme: [5800, 3] };
  const SINIF_KATSAYI = { premium: 1.45, orta: 1.1, ekonomik: 0.95 };
  const NOTLAR = {
    kaporta: [
      "Fotoğrafa göre çamurlukta klasik düzeltme öngörüyorum; boyasız göçük düzeltmeye uygunsa fiyat düşer.",
      "Parça değişimi yerine onarım planladım. Araç görüldükten sonra kesin fiyatı aynı gün bildiririz.",
    ],
    boya: [
      "Renk kodu ile karışım yapılıp komşu parçaya geçişli boya uygulanacak, pasta-cila dahil.",
      "Fırın boya uygulanır; teslimde mikron ölçüm sonuçlarını paylaşıyoruz.",
    ],
    mekanik: [
      "Arıza tespiti için diagnostik cihaz kontrolü ve test sürüşü fiyata dahildir.",
      "Önce ön kontrol yapılacak; ek parça gerekirse gerekçesiyle platformdan bildireceğiz.",
    ],
    elektrik: [
      "Önce akü ve şarj sistemi testi yapılacak, kablo tesisatı onarımı fiyata dahildir.",
      "Beyin arıza kodları okunup raporlanır; rapor teslimde size verilir.",
    ],
    doseme: [
      "Orijinal dokuya en yakın kumaş ve deri numunelerini teslimde göstereceğiz.",
      "Döşeme sökülmeden önce size numune onayı soracağız.",
    ],
  };
  const EKLER = ["Teslimde iç-dış yıkama hediyemizdir.", "Aynı gün içinde randevu verebiliyoruz.", "", "", "Bekleme salonumuzda Wi-Fi ve ikram var."];

  // Bir dükkanın teklifini oluşturur (otomatik teklifler ve panel örnekleri ortak kullanır)
  V.teklifOlustur = function (dukkan, talep, r, sira) {
    const marka = V.marka(talep.arac.marka);
    const yil = Number(talep.arac.yil) || 2018;
    const yilKatsayi = yil >= 2022 ? 1.15 : yil >= 2017 ? 1 : yil >= 2010 ? 0.9 : 0.8;
    const kapsam = talep.kategoriler.filter((k) => dukkan.kategoriler.includes(k));
    const hesap = kapsam.length ? kapsam : talep.kategoriler.slice(0, 1);
    const taban = hesap.reduce((t, k) => t + TABAN[k][0], 0) * (hesap.length > 1 ? 0.9 : 1);
    const sadeceBoya = hesap.every((k) => k === "boya");
    const parcaTuru = sadeceBoya ? "yok" : r.sec(["orijinal", "orijinal", "muadil", "muadil", "cikma"]);
    const parcaKatsayi = { orijinal: 1.12, muadil: 0.94, cikma: 0.82, yok: 1 }[parcaTuru];
    const ham = taban * SINIF_KATSAYI[marka ? marka.sinif : "orta"] * yilKatsayi * parcaKatsayi * r.aralik(0.86, 1.22);
    const tutar = Math.round(ham / 50) * 50;
    const iscilikOran = parcaTuru === "yok" ? 1 : r.aralik(0.38, 0.55);
    const iscilik = Math.round((tutar * iscilikOran) / 50) * 50;
    const sureGun = Math.max(1, Math.round(hesap.reduce((t, k) => t + TABAN[k][1], 0) * (hesap.length > 1 ? 0.8 : 1) + r.tam(0, 2)));
    const ayniIlce = dukkan.ilce === talep.ilce;
    const not = [r.sec(NOTLAR[hesap[0]]), r.sec(EKLER)].filter(Boolean).join(" ");
    return {
      id: `${talep.id}-${dukkan.id}`,
      dukkan: { ...dukkan },
      tutar,
      iscilik,
      parca: tutar - iscilik,
      parcaTuru,
      sureGun,
      garantiAy: dukkan.garantiAy,
      kapsam,
      mesafeKm: Math.round((ayniIlce ? r.aralik(0.6, 3.2) : r.aralik(3.5, 14.8)) * 10) / 10,
      cekici: talep.yuruyor === false ? r.sec(["ucretsiz", "ucretli"]) : r() > 0.7 ? "ucretsiz" : null,
      sokumBedeli: r() > 0.6 ? 0 : r.sec([500, 750, 1000]),
      not,
      gelisSn: [3, 8, 14, 22, 33, 45][sira] ?? 50,
      durum: "beklemede",
      kaynak: "otomatik",
    };
  };

  // Aynı ilde yeterli örnek dükkan yoksa talebin iline sanal dükkanlar üretilir
  const SANAL_ADLAR = [["Merkez Oto Servis", "MO"], ["Yıldız Kaporta Boya", "YK"], ["Güven Oto Tamir", "GO"], ["Usta Eller Oto", "UE"], ["Özgür Oto Elektrik", "ÖE"], ["Sanayi Döşeme Evi", "SD"]];
  function sanalDukkanlar(talep, adet, r) {
    const ilceler = V.ilceleriGetir(talep.il);
    return SANAL_ADLAR.slice(0, adet).map(([ad, kisa], i) => {
      const puan = Math.round(r.aralik(4.3, 4.9) * 10) / 10;
      return {
        id: `s${i + 1}`, ad, kisa, ton: i % 4, il: talep.il, ilce: r.sec(ilceler), kategoriler: talep.kategoriler.slice(),
        puan, degerlendirme: r.tam(24, 180), tamamlanan: r.tam(90, 700), sadakat: r.tam(88, 97), yanitDk: r.tam(15, 55),
        garantiAy: r.sec([6, 6, 12, 24]), kurulus: r.tam(2005, 2020), sahibi: "", adres: "Sanayi Sitesi " + r.tam(1, 9) + ". Blok No: " + r.tam(1, 60),
        tel: "0" + r.tam(222, 488) + " 000 00 " + String(r.tam(10, 99)), saatler: "Hafta içi 08:30–18:30",
        kriterler: { iscilik: puan, fiyat: Math.min(5, puan + 0.1), zaman: Math.max(4, puan - 0.2), iletisim: puan }, anlasmali: r() > 0.3,
      };
    });
  }

  // Talebin kategorileriyle en az bir kesişimi olan, aynı ildeki dükkanlardan teklif üretir.
  // Demo dükkanı (d1) otomatik teklif vermez; onun teklifi Dükkan Paneli'nden gelir.
  V.teklifleriUret = function (talep) {
    const r = V.rastgele(talep.id);
    let adaylar = V.dukkanlar.filter((d) => d.id !== V.DEMO_DUKKAN && d.il === talep.il && d.kategoriler.some((k) => talep.kategoriler.includes(k)));
    adaylar = r.karistir(adaylar).slice(0, 5);
    if (adaylar.length < 4) adaylar = adaylar.concat(sanalDukkanlar(talep, 4 - adaylar.length, r));
    // Önce kapsamı tam olanlar gelsin
    adaylar.sort((a, b) => talep.kategoriler.filter((k) => !b.kategoriler.includes(k)).length - talep.kategoriler.filter((k) => !a.kategoriler.includes(k)).length);
    return adaylar.map((d, i) => V.teklifOlustur(d, talep, r, i));
  };

  // Talebin iletildiği dükkan sayısı (kategori + il eşleşmesi, sanal havuz dahil)
  V.iletilenDukkanSayisi = function (talep) {
    const r = V.rastgele(talep.id + "-say");
    const gercek = V.dukkanlar.filter((d) => d.il === talep.il && d.kategoriler.some((k) => talep.kategoriler.includes(k))).length;
    return gercek + r.tam(6, 14);
  };

  // Hiç talep oluşturulmamışsa Teklif Takip sayfasında gösterilen örnek talep
  V.ornekTalep = function () {
    const simdi = Date.now();
    const talep = {
      id: "TP-4821",
      ornek: true,
      olusturma: simdi - 3 * 3600e3,
      arac: { marka: "BMW", model: "3 Serisi", yil: 2019, paket: "M Sport" },
      kategoriler: ["kaporta", "boya"],
      aciklama: "Park halindeyken sağ ön çamurluğa sürtme oldu. Çamurlukta göçük ve boya kalkması var, far çerçevesinde çizik. Araç yürür durumda.",
      fotolar: [],
      yuruyor: true,
      il: "İstanbul",
      ilce: "Kadıköy",
      iletisim: { ad: "Deniz", soyad: "Yılmaz", tel: "5321234567" },
      asama: "teklif",
      olaylar: [{ zaman: simdi - 3 * 3600e3, metin: "Talep oluşturuldu ve telefon doğrulandı" }],
    };
    talep.teklifler = V.teklifleriUret(talep).map((t) => ({ ...t, gelisSn: 0 }));
    talep.iletilen = V.iletilenDukkanSayisi(talep);
    return talep;
  };

  // Dükkan panelindeki örnek gelen talepler (müşteri adı/telefonu seçimden önce gizlidir)
  V.panelTalepleri = [
    { id: "TP-4817", arac: { marka: "Volkswagen", model: "Golf", yil: 2020, paket: "Style" }, kategoriler: ["kaporta", "boya"], il: "İstanbul", ilce: "Kadıköy", mesafeKm: 2.1, kalanDk: 21 * 60 + 40, teklifSayisi: 3, fotoSayisi: 3, aciklama: "Arka tampon ve bagaj kapağında göçük, stop lambası sağlam. Araç yürür durumda.", yeni: true },
    { id: "TP-4812", arac: { marka: "Renault", model: "Clio", yil: 2017, paket: "Touch" }, kategoriler: ["boya"], il: "İstanbul", ilce: "Üsküdar", mesafeKm: 4.8, kalanDk: 17 * 60 + 5, teklifSayisi: 5, fotoSayisi: 2, aciklama: "Kaput ve tavanda güneşten boya atması var. Lokal mi komple mi olur bilemedim." },
    { id: "TP-4809", arac: { marka: "Toyota", model: "Corolla", yil: 2022, paket: "Flame" }, kategoriler: ["kaporta"], il: "İstanbul", ilce: "Ataşehir", mesafeKm: 5.6, kalanDk: 9 * 60 + 30, teklifSayisi: 4, fotoSayisi: 4, aciklama: "Sol arka kapıda sürtme sonucu derin çizik ve hafif göçük." },
    { id: "TP-4803", arac: { marka: "Mercedes-Benz", model: "C Serisi", yil: 2021, paket: "AMG Line" }, kategoriler: ["kaporta", "boya"], il: "İstanbul", ilce: "Maltepe", mesafeKm: 7.9, kalanDk: 4 * 60 + 12, teklifSayisi: 6, fotoSayisi: 5, aciklama: "Ön tampon ve sağ çamurlukta hasar, park sensörü yerinden çıkmış. Araç yürür durumda." },
    { id: "TP-4798", arac: { marka: "Fiat", model: "Egea Sedan", yil: 2019, paket: "Urban" }, kategoriler: ["boya"], il: "İstanbul", ilce: "Kadıköy", mesafeKm: 1.4, kalanDk: 2 * 60 + 50, teklifSayisi: 2, fotoSayisi: 0, aciklama: "Sağ ayna kapağı ve ön kapıda çizikler var." },
  ];

  window.TP_VERI = V;
})();
