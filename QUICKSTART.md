# A/M-8 Motors - Quick Reference

## Getting Started (5 minutes)

```bash
# 1. Setup
chmod +x setup.sh && ./setup.sh

# 2. Run dev server
npm run dev

# 3. Open http://localhost:3000
```

## Default Credentials
- **Admin**: admin@am8motors.com / admin123
- **User**: Register via /register

## Key Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm start` | Production server (with Socket.io) |
| `npm run build` | Build for production |
| `npm run db:studio` | Prisma database GUI |
| `npm run db:seed` | Seed sample data |
| `npx prisma db push` | Update database schema |

## File Structure Quick Nav
```
app/page.tsx              → Homepage
app/dashboard/page.tsx    → Auction listings
app/auction/[id]/page.tsx → Live auction room
app/admin/                → Admin panel
app/api/                  → API routes
components/               → React components
lib/                      → Utilities & helpers
prisma/schema.prisma      → Database schema
server.js                 → Socket.io server
```

## Common Tasks

### Add a new car
1. Login as admin
2. Go to /admin/cars
3. Click "Add Car"
4. Fill details and save

### Schedule an auction
1. Go to /admin/auctions
2. Click "Schedule Auction"
3. Select car, set times, save

### Join an auction
1. Browse /dashboard
2. Click on auction
3. Pay $3 entry fee
4. Enter access code
5. Start bidding!

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Custom Theme
- **Database**: SQLite (Prisma ORM)
- **Real-time**: Socket.io
- **Payments**: Stripe
- **Auth**: JWT + bcrypt
- **Email**: Nodemailer
