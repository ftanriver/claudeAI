# Fuzul Ev finansman kartları

HTML şablonları ve `kartlar.js` verisinden PNG kart görselleri üretir (2x çözünürlük). Kartlar: `fuzul-ev-tasit-finansmani`, `fuzul-ev-konut-finansmani`.

| Yerleşim | Şablon | Oran | Boyut (px) | Çıktı |
| --- | --- | --- | --- | --- |
| Klasik | `kart.html` | ~1,07:1 | 1520 × 1416 (butonsuz 1520 × 1148) | `cikti/<kart>-butonlu.png`, `cikti/<kart>-butonsuz.png` |
| Dikey | `kart-dikey.html` | 4:5 | 1520 × 1900 | `cikti/alternatifler/<kart>-dikey.png` |
| Kare | `kart-kare.html` | 1:1 | 1520 × 1520 | `cikti/alternatifler/<kart>-kare.png` |
| Yatay | `kart-yatay.html` | 16:9 | 1920 × 1080 | `cikti/alternatifler/<kart>-yatay.png` |

Tüm yerleşimler aynı logo/başlık satırını, rozeti ve "Hızlı Başvur" butonunu (`ortak.css`, `ortak.js`) kullanır. Dikey, kare ve yatay yerleşimlerde aylık taksit öne çıkarılır.

## Yeni kart veya tutar değişikliği

1. `kartlar.js` içindeki değerleri düzenleyin ya da yeni bir kart ekleyin (`tur`: `tasit` veya `konut`, `buton`: CTA metni).
2. `npm install` (ilk seferde) ve ardından `npm run render`. Görseller `cikti/` klasörüne yazılır.

Tarayıcıda önizleme: `kart-dikey.html?kart=fuzul-ev-konut-finansmani` (butonsuz hali için sonuna `&buton=0` ekleyin)

Yazı tipi FreeSans'tır (Linux `fonts-freefont-ttf`). Yüklü değilse Helvetica Neue/Arial kullanılır ve metinler birkaç piksel kayabilir. İkonlar [Lucide](https://lucide.dev) setinden alınmıştır (ISC lisansı).
