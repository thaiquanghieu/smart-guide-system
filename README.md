# smart-guide-system

## Deploy khuyen nghi

- `services/api` -> Render
- `apps/pwa` -> Vercel

## Render cho API

- `render.yaml` hien chi giu service `smartguide-api`
- Tao Postgres tren Render
- Gan env `DATABASE_URL`

## Vercel cho PWA

- Import tu GitHub
- Chon `Root Directory = apps/pwa`
- Dat env:

```text
NEXT_PUBLIC_API_URL=https://TEN-API-RENDER/api
```

## QR tren seller

- Trong seller web, o tab `QR`, truong `PWA URL` phai la link public cua PWA
- Vi du:

```text
https://ten-pwa.vercel.app
```

- QR se mo:

```text
https://ten-pwa.vercel.app/qr/ENTRY_CODE
```
