# Quick Commands Reference

## 🚀 Start Everything at Once

```bash
chmod +x start-all.sh
./start-all.sh
```

## Backend Only

```bash
cd services/api
dotnet run
# API: http://192.168.22.4:5022
```

## Seller Web Only

```bash
cd apps/seller-web
npm install
npm run dev
# Open: http://localhost:3000
```

## Admin Web Only

```bash
cd apps/admin-web
npm install
npm run dev
# Open: http://localhost:3001
```

## Database

```bash
# Initialize schema
psql -U postgres -d smartguide -f services/api/database/init.sql

# Insert seed data
psql -U postgres -d smartguide -f services/api/database/seed.sql

# Connect to DB
psql -U postgres -d smartguide
```

## Mobile App (MAUI)

```bash
cd SmartGuideApp
dotnet build -t:Run -f net8.0-ios -p:_DeviceName="device-name"
```

## Build for Production

```bash
# Backend
cd services/api
dotnet publish -c Release

# Seller Web
cd apps/seller-web
npm run build
npm start

# Admin Web
cd apps/admin-web
npm run build
npm start
```

## Test Account Credentials

### Owner Login

- Email: `owner1@example.com`
- Password: `123456`
- URL: http://localhost:3000/auth/login

### Admin Login

- Email: `admin@smartguide.com`
- Password: `123456`
- URL: http://localhost:3001/auth/login

## API Endpoints Quick Reference

### Authentication

```
POST /api/auth/register         # Register user/owner
POST /api/auth/login            # Login user/owner
POST /api/auth/admin-login      # Login admin
GET /api/auth/user/{id}         # Get user info
```

### Owner POI Management

```
GET /api/owner/pois             # List owner's POIs
POST /api/owner/pois            # Create POI
PUT /api/owner/pois/{id}        # Update POI
DELETE /api/owner/pois/{id}     # Delete POI
GET /api/owner/pois/{id}        # Get POI detail
GET /api/owner/pois/analytics/summary  # Analytics
```

### Owner Audio

```
GET /api/owner/audio/{poiId}    # Get audio guides
POST /api/owner/audio/tts       # Create audio
PUT /api/owner/audio/{id}       # Update audio
DELETE /api/owner/audio/{id}    # Delete audio
```

### Admin Management

```
GET /api/admin/users            # List users
PUT /api/admin/users/{id}/toggle-active
DELETE /api/admin/users/{id}    # Delete user
GET /api/admin/pois             # List all POIs
PUT /api/admin/pois/{id}/approve
PUT /api/admin/pois/{id}/reject
DELETE /api/admin/pois/{id}
GET /api/admin/analytics/dashboard
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9  # Seller web
lsof -ti:3001 | xargs kill -9  # Admin web
lsof -ti:5022 | xargs kill -9  # API
```

### Database Issues

```bash
# Check PostgreSQL
psql -U postgres -d smartguide -c "SELECT COUNT(*) FROM users;"

# Reset database
dropdb -U postgres smartguide
createdb -U postgres smartguide
psql -U postgres -d smartguide -f services/api/database/init.sql
psql -U postgres -d smartguide -f services/api/database/seed.sql
```

### Clear Dependencies

```bash
# Seller web
cd apps/seller-web
rm -rf node_modules package-lock.json
npm install

# Admin web
cd apps/admin-web
rm -rf node_modules package-lock.json
npm install
```

## Environment Variables

### Seller Web (.env.local)

```
NEXT_PUBLIC_API_URL=http://192.168.22.4:5022/api
```

### Admin Web (.env.local)

```
NEXT_PUBLIC_API_URL=http://192.168.22.4:5022/api
```

### Backend (appsettings.json)

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Port=5432;Database=smartguide;User Id=postgres;Password=your_password;"
  }
}
```

## Performance Tips

- Use `npm run build` before production
- Enable database indexes (already in init.sql)
- Use lazy loading for images
- Cache API responses with SWR
- Monitor API response times

## Security Checklist

- [ ] Change default passwords
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS in production
- [ ] Set up CORS properly
- [ ] Add rate limiting
- [ ] Use secure session storage
- [ ] Validate all inputs
- [ ] Sanitize user data
