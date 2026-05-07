# smart-guide-system

## Deploy khuyen nghi

- `services/api` -> Railway
- `database postgres` -> Railway
- `apps/pwa` -> Vercel
- `apps/seller-web` -> Vercel
- `apps/admin-web` -> Vercel

## Railway cho API va Database

- Deploy `services/api` len Railway
- Tao Postgres tren Railway
- Gan env `DATABASE_URL`

## Vercel cho PWA

- Import tu GitHub
- Chon `Root Directory = apps/pwa`
- Dat env:

```text
NEXT_PUBLIC_API_URL=https://TEN-API-RAILWAY/api
```

## Vercel cho Seller va Admin

- `apps/seller-web` deploy tren Vercel
- `apps/admin-web` deploy tren Vercel
- Dat `NEXT_PUBLIC_API_URL` tro ve API Railway

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
