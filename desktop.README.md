# T.C. ANATOLIA-Q Masaustu

Bu paket Electron tabanli bir Windows masaustu uygulamasi iskeleti kurar.

## Kurulum

1. `npm install`
2. `npm run desktop:start`

## Paket Alma

1. `npm run desktop:dist`
2. Cikti `dist/` altina duser.

## Windows tek komut

PowerShell:

`powershell -ExecutionPolicy Bypass -File .\scripts\build-desktop.ps1`

Sadece portable istenirse:

`powershell -ExecutionPolicy Bypass -File .\scripts\build-desktop.ps1 -PortableOnly`

Farkli adres acilacaksa:

`powershell -ExecutionPolicy Bypass -File .\scripts\build-desktop.ps1 -AppUrl "https://ornek-adres"`

## GitHub Actions

Repo icinde `Actions > Build Desktop App` uzerinden Windows artifact uretilebilir.

## Not

Varsayilan olarak uygulama `https://anatolia-q.onrender.com/` adresini masaustu kabugu icinde acar.

Istenirse farkli canli adres icin:

`ANATOLIA_Q_DESKTOP_URL=https://ornek-adres npm run desktop:start`
