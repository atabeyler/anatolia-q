# ANATOLIA-Q Frontend Revizyonu

Bu klasor, `https://anatolia-q.onrender.com/` uzerindeki mevcut ANATOLIA-Q uygulamasi icin hazirlanmis yeni on yuz kopyasidir.

## Bu pakette ne var

- `index.html`
  Yeni arayuz. Mobil uyum, daha temiz bilgi hiyerarsisi, daha net analiz akisi ve token destekli API istekleri icerir.
- `index.original.html`
  Canli surumden alinmis orijinal HTML kopyasi.
- `render.yaml`
  Render uzerinde static site olarak deploy etmek icin blueprint dosyasi.

## Onemli not

Bu calisma klasorunde backend kaynak kodu veya mevcut Render reposu bulunmadigi icin, burada yapilan teslimat frontend odaklidir.

Yeni on yuz su sekilde davranir:

- Ayni origin'de calisiyorsa kendi backend'ini kullanir.
- `localhost` gibi yerel ortamda aciliyorsa varsayilan olarak `https://anatolia-q.onrender.com` API'sine baglanir.

Bu sayede:

- mevcut backend degismeden yeni arayuzu ayri bir Render static site olarak deploy edebilirsin
- veya bu `index.html` dosyasini mevcut backend reposunda eski HTML'in yerine koyabilirsin

## Render deploy

Render dokumanina gore static site icin `runtime: static` ve `staticPublishPath` gereklidir:

- Blueprint YAML Reference: https://render.com/docs/blueprint-spec
- Static Sites: https://render.com/docs/static-sites

Bu klasoru bir Git reposuna koyup Render'a bagladiginda `render.yaml` dosyasi ile deploy alabilirsin.

## Sonraki entegrasyon

Elinde mevcut repo varsa ideal entegrasyon su olur:

1. Bu klasordeki `index.html` dosyasini mevcut frontend giris noktasi ile degistir.
2. Gerekirse backend'in HTML template veya static serving katmanina tasinir.
3. Deploy sonrasi login, verify, analyze ve history endpoint'leri canli hesap ile test edilir.

## Tespit edilen kritik konu

Canli HTML icinde analiz istegi oturum token'ini gondermiyordu. Bu yeni surumde istekler token ile gonderilir:

- `Authorization: Bearer <token>`
- `X-Auth-Token: <token>`

Bu degisiklik, `401 Unauthorized` davranisina neden olan en bariz kopuklugu kapatir.
