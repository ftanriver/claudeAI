# Oto tamir pazaryeri (TamirPort) prototipi

Araç sahiplerinin hasar ve arızalarını fotoğraf ya da açıklamayla anlatıp dükkanlardan teklif aldığı bir pazaryerinin tıklanabilir prototipidir. Ana mesaj **"Güvenle yaptır"**: kullanıcı dükkanlarla numarası gizli kalarak yazışır, teklifi seçer, aracını dükkana teslim eder, kesin fiyatı onaylayıp öder. Ödeme karşılıklı onaya kadar güvencede bekler. **TamirPort** çalışma adıdır.

- Ürün akışı, açık noktalar ve karşılıklı kurallar: [`dokuman/urun-akisi-ve-kurallar.md`](dokuman/urun-akisi-ve-kurallar.md)
- Aynı içeriğin görsel özeti prototipin içinde: `akis.html`
- Türkiye içi benchmark (rakip platformlar ve çıkarımlar): [`dokuman/rakip-analizi.md`](dokuman/rakip-analizi.md)

## Ekranlar

| Dosya | Ekran | Neyi gösterir |
| --- | --- | --- |
| `index.html` | Ana sayfa | Header, hasar tespit sihirbazı + SMS kodu, anlaşmalı firmalar, puan tablosu, ne sağlıyoruz, markalar, rehber, SSS, footer |
| `talep.html` | Teklif takip | Misafir kullanıcının teklifleri gördüğü sayfa: karşılaştırma, maskeli mesajlaşma, seçim, randevu, teslim kodu, kesin fiyat/revize, güvenli ödeme, onarım, karşılıklı onay, itiraz, puanlama |
| `dukkan-paneli.html` | Dükkan paneli | Kategoriye göre filtrelenmiş talepler, ek bilgi isteme, teklif formu (komisyon ve net hakediş hesabı), mesajlar, aktif işler, hakedişler, değerlendirmeler, profil |
| `musteri-paneli.html` | Müşteri paneli | Taleplerim, Garajım, ödemeler, değerlendirmeler, bildirim tercihleri |
| `akis.html` | Akış ve kurallar | Uçtan uca akış, durumlar, açık noktalar, kurallar, onay bekleyen kararlar, faz planı |

## Çalıştırma

Derleme adımı yoktur; dosyalar statik HTML, CSS ve JavaScript'tir. `index.html` dosyasını tarayıcıda açmak yeterli. Sayfalar arası geçişte durumun korunması için yerel bir sunucu önerilir:

```bash
npx http-server oto-tamir-pazaryeri -p 8080
```

Yazı tipleri (Barlow Semi Condensed, Barlow Condensed, Figtree) Google Fonts'tan yüklenir. İnternet yoksa sistem yazı tipleri kullanılır.

## Uçtan uca deneme

1. Ana sayfada formu doldur (sağ alttaki **Prototip kontrolleri › Örnek verilerle doldur** işi hızlandırır) ve ekranın üstünde görünen SMS kodunu gir.
2. Teklif takip sayfasında teklifler birkaç saniye içinde tek tek gelir. Bir teklif kartındaki **Mesaj** ile dükkana yaz: mesajdaki numara, e-posta, bağlantı ve IBAN gizlenir, örnek dükkan birkaç saniye içinde yanıt verir.
3. Başka bir sekmede **Dükkan paneli › Gelen talepler**'den talebine teklif ver ya da **Ek bilgi iste** ile müşteriye yaz. Yazışmalar **Mesajlar**'da toplanır ve müşteri sayfasına anında düşer. Kategorisi dükkanın kategorilerine uymayan talepler listeye düşmez; bunu Profil'den kategorileri değiştirerek deneyebilirsin.
4. Teklif takip sayfasında kendi teklifini seç. Diğer dükkanlarla yazışmalar salt okunur olur; seçtiğin dükkanla yazışmada numara artık gizlenmez, IBAN yine gizlenir. Randevu al ve teslim kodunu not et.
5. Dükkan panelinde **Aktif işler**'den adımları yürüt: teslim kodu, kesin fiyat/revize, onarımı tamamla, teslim alma kodu. Müşteri sayfası her adımda güncellenir.
6. Müşteri tarafında öde, onay ver ve dükkanı puanla. Hakediş ve değerlendirme dükkan paneline yansır.

**Prototip kontrolleri** ile dükkan tarafını beklemeden herhangi bir aşamaya atlayabilirsin.

## Teknik notlar

- Tüm durum tarayıcının `localStorage` alanında `tamirport-prototip-v2` anahtarıyla tutulur. Depolama kapalıysa sayfalar örnek verilerle bellekte çalışır. Sekmeler arası güncelleme `storage` olayıyla yapılır.
- `assets/js/veri.js`: örnek dükkanlar, marka/model/paket listeleri, 81 il ve büyükşehir ilçeleri, rehber içerikleri, teklif üretimi. Aynı talep her açılışta aynı teklifleri üretir.
- `assets/js/ortak.js`: talep akışının durum geçişleri (`TP.akis`), maskeli mesajlaşma (`TP.maskele`, `TP.sohbet`), SMS kodu bileşeni, modal, bildirim ve prototip kontrolleri.
- Maskeleme kural tabanlıdır: seçimden önce telefon, e-posta, bağlantı ve sosyal medya hesabı; her zaman IBAN ve kart numarası gizlenir. Fiyat, tarih, kilometre ve plaka gibi sayılar gizlenmez. Gerçek üründe sunucu tarafında da uygulanmalıdır.
- Kart bilgisi alınmaz; ödeme adımı simüle edilir. SMS'ler ekranın üstünde bildirim olarak gösterilir.
- Marka adları yazı olarak gösterilir; logolar marka sahiplerinin kurallarına göre eklenmelidir.
- İkonlar [Lucide](https://lucide.dev) setinden alınmıştır (ISC lisansı).
