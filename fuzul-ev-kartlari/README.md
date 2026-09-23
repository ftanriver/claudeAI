# Fuzul Ev finansman kartları

`kart.html` şablonu ve `kartlar.js` verisinden PNG kart görselleri üretir (1520 px genişlik, 2x).

| Kart | Görsel |
| --- | --- |
| Taşıt Finansmanı | `cikti/fuzul-ev-tasit-finansmani.png` |
| Konut Finansmanı | `cikti/fuzul-ev-konut-finansmani.png` |

## Yeni kart veya tutar değişikliği

1. `kartlar.js` içindeki değerleri düzenleyin ya da yeni bir kart ekleyin (`ikon`: `tasit` veya `konut`).
2. `npm install` (ilk seferde) ve ardından `npm run render`. Görseller `cikti/` klasörüne yazılır.

Tarayıcıda önizleme: `kart.html?kart=fuzul-ev-konut-finansmani`

Yazı tipi FreeSans'tır (Linux `fonts-freefont-ttf`). Yüklü değilse Helvetica Neue/Arial kullanılır ve metinler birkaç piksel kayabilir. Rozet ikonları [Lucide](https://lucide.dev) setinden alınmıştır (ISC lisansı).
