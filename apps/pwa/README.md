# Smart Guide PWA

## Chay local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Mac dinh app chay o:

```text
http://localhost:3002
```

## QR test

```text
/qr/fair-2026?poiId=1
```

## Flow

- Quet QR vao `map`
- Neu thiet bi chua co goi, cap `1 luot nghe mien phi`
- Nghe xong hien `paywall`
- Mua xong quay lai dung `POI` dang cho

## Deploy PWA len Vercel

- Import project tu GitHub
- Chon `Root Directory` la `apps/pwa`
- Dat env:

```text
NEXT_PUBLIC_API_URL=https://smartguide-api.onrender.com/api
```

Khong can `API_PROXY_TARGET` khi deploy len Vercel.

## Test tren dien thoai bang ngrok

Trong local `.env.local`:

```env
NEXT_PUBLIC_API_URL=/api
API_PROXY_TARGET=http://127.0.0.1:5022
```

Chi can:

- chay backend local `5022`
- chay PWA `3002`
- mo `ngrok` cho `3002`
