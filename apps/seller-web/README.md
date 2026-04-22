# Smart Guide - Seller Web Dashboard

POI Owner (Chủ gian hàng) dashboard for managing Points of Interest, audio guides, and analytics.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL (backend must be running)

### Installation

```bash
# Install dependencies
npm install

# Create .env.local (if needed)
cp .env.example .env.local
```

### Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── pages/          # Next.js pages/routes
├── components/     # React components
├── lib/            # Utilities (api, store)
└── styles/         # Global styles
```

## 🔐 Authentication

- Register as "Owner" role
- Login with email/username
- Auth state stored in localStorage + Zustand store

## 📌 Features

- ✅ Authentication (Register/Login)
- ✅ Dashboard with analytics
- ✅ POI Management (Create/Edit/Delete)
- ✅ Status tracking (Pending/Approved/Rejected)
- ✅ Analytics & Statistics
- ✅ Profile management (coming soon)

## 🎨 Styling

- Tailwind CSS
- Dark blue theme with bright blue accents
- Responsive design

## 🔗 API Integration

Base URL: `http://192.168.22.4:5022/api` (configurable via `NEXT_PUBLIC_API_URL`)

Key endpoints:

- `POST /auth/register` - Register owner
- `POST /auth/login` - Login owner
- `GET /owner/pois` - List POIs
- `POST /owner/pois` - Create POI
- `GET /owner/pois/analytics/summary` - Get analytics
