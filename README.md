# A/M-8 Motors Auctions

A production-ready, real-time international car auction platform connecting UAE (Sharjah) car suppliers with buyers in Tajikistan.

## Features

- **Real-time Bidding**: Live auction rooms with WebSocket-based bidding
- **Premium UI**: Dark theme with gold accents, Tesla-style design
- **Secure Authentication**: JWT-based auth with email OTP verification
- **Payment Integration**: Stripe-powered $3 entry fee system
- **Access Codes**: Unique codes per auction for verified entry
- **Admin Panel**: Full management dashboard for cars, auctions, and users
- **Winner System**: Automatic winner selection with email notifications
- **Responsive Design**: Works on all devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Socket.io
- **Database**: SQLite (Prisma ORM)
- **Payments**: Stripe
- **Email**: Nodemailer
- **Auth**: JWT, bcryptjs

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

3. Initialize database:
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

4. Run development server:
```bash
npm run dev
```

For production with Socket.io:
```bash
npm start
```

## Default Admin
- Email: `admin@am8motors.com`
- Password: `admin123`

## Project Structure

```
app/
  ├── api/           # API routes
  ├── auction/       # Auction room
  ├── admin/         # Admin panel
  ├── dashboard/     # User dashboard
  ├── login/         # Login page
  ├── register/      # Registration
  ├── verify/        # OTP verification
  └── payment/       # Payment page
components/          # React components
lib/                 # Utilities, auth, email
prisma/              # Database schema
public/              # Static assets
server.js            # Socket.io server
```

## License

MIT
