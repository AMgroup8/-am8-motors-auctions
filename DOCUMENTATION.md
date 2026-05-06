# A/M-8 Motors Auctions - Technical Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │   Home   │ │ Dashboard│ │ Auction  │ │  Admin   │       │
│  │   Page   │ │   Page   │ │   Room   │ │  Panel   │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
│  ┌────┴────────────┴────────────┴────────────┴─────┐       │
│  │              React Components                     │       │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │       │
│  │  │  Auth   │ │ Socket  │ │   UI    │           │       │
│  │  │Provider │ │Provider │ │Components│           │       │
│  │  └─────────┘ └─────────┘ └─────────┘           │       │
│  └─────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────┴────────────────────────────────────┐
│                      SERVER LAYER                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js 14 App Router                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │  Auth    │ │ Auction  │ │ Payment  │            │    │
│  │  │   API    │ │   API    │ │   API    │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │   Car    │ │  Admin   │ │ Webhook  │            │    │
│  │  │   API    │ │   API    │ │  Stripe  │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Socket.io Server                        │    │
│  │  • Real-time bidding                                 │    │
│  │  • Live countdown timers                             │    │
│  │  • Participant tracking                              │    │
│  │  • Auction state management                          │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │ Prisma ORM
┌────────────────────────┴────────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SQLite Database                         │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │    │
│  │  │ Users  │ │  Cars  │ │Auctions│ │  Bids  │      │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘      │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐                 │    │
│  │  │Payments│ │Access  │ │Winners │                 │    │
│  │  │        │ │ Codes  │ │        │                 │    │
│  │  └────────┘ └────────┘ └────────┘                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Users Table
| Field      | Type      | Description                    |
|------------|-----------|--------------------------------|
| id         | UUID      | Primary key                    |
| name       | String    | Full name                      |
| email      | String    | Unique, verified               |
| phone      | String?   | Contact number                 |
| country    | String?   | User country                   |
| password   | String    | Hashed with bcrypt             |
| role       | Enum      | USER / ADMIN                   |
| isVerified | Boolean   | Email verification status      |
| otp        | String?   | Temporary OTP code             |
| otpExpires | DateTime? | OTP expiration                 |

### Cars Table
| Field         | Type   | Description                 |
|---------------|--------|-----------------------------|
| id            | UUID   | Primary key                 |
| title         | String | Car title                   |
| description   | String?| Detailed description        |
| images        | JSON   | Array of image URLs         |
| startingPrice | Float  | Base auction price          |
| mileage       | Int?   | Kilometers                  |
| fuelType      | String?| Petrol/Diesel/Hybrid/Electric|
| condition     | String | Used/New/Certified          |
| location      | String | Sharjah, UAE (default)      |
| year          | Int?   | Manufacturing year          |
| make          | String?| Manufacturer                |
| model         | String?| Model name                  |
| status        | Enum   | AVAILABLE/IN_AUCTION/SOLD   |

### Auctions Table
| Field           | Type      | Description              |
|-----------------|-----------|--------------------------|
| id              | UUID      | Primary key              |
| carId           | String    | FK to Cars               |
| startTime       | DateTime  | Auction start            |
| endTime         | DateTime  | Auction end              |
| startingPrice   | Float     | Initial bid amount       |
| currentBid      | Float?    | Current highest bid      |
| minBidIncrement | Float     | Minimum bid step (100)   |
| duration        | Int       | Duration in minutes      |
| status          | Enum      | SCHEDULED/ACTIVE/ENDED   |

### Bids Table
| Field     | Type      | Description              |
|-----------|-----------|--------------------------|
| id        | UUID      | Primary key              |
| amount    | Float     | Bid amount               |
| auctionId | String    | FK to Auctions           |
| userId    | String    | FK to Users              |
| createdAt | DateTime  | Bid timestamp            |

## API Endpoints

### Authentication
| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| POST   | /api/auth/register | User registration        |
| POST   | /api/auth/verify   | OTP verification         |
| POST   | /api/auth/login    | User login               |
| POST   | /api/auth/logout   | User logout              |
| GET    | /api/auth/me       | Get current user         |

### Cars
| Method | Endpoint        | Description              |
|--------|-----------------|--------------------------|
| GET    | /api/cars       | List all cars            |
| GET    | /api/cars/:id   | Get car details          |

### Auctions
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | /api/auctions         | List auctions            |
| GET    | /api/auctions/:id     | Get auction details      |
| POST   | /api/auctions/:id/join| Join auction room        |

### Payments
| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| POST   | /api/payments/create    | Create payment intent    |
| POST   | /api/payments/verify    | Verify payment           |

### Admin
| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| GET    | /api/admin/stats        | Dashboard statistics     |
| GET    | /api/admin/cars         | List all cars            |
| POST   | /api/admin/cars         | Create car               |
| PUT    | /api/admin/cars/:id     | Update car               |
| DELETE | /api/admin/cars/:id     | Delete car               |
| GET    | /api/admin/auctions     | List all auctions        |
| POST   | /api/admin/auctions     | Create auction           |
| GET    | /api/admin/users        | List all users           |

## WebSocket Events

### Client → Server
| Event           | Payload                        | Description              |
|-----------------|--------------------------------|--------------------------|
| authenticate    | { token: string }              | Auth socket connection   |
| join_auction    | { auctionId, accessCode }      | Enter auction room       |
| place_bid       | { auctionId, amount }          | Submit bid               |
| leave_auction   | { auctionId }                  | Exit auction room        |

### Server → Client
| Event             | Payload                      | Description              |
|-------------------|------------------------------|--------------------------|
| authenticated     | { success: boolean }         | Auth confirmation        |
| auction_state     | { currentBid, highestBidder, endTime, participants } | Initial state |
| new_bid           | { amount, bidder, timestamp }| New bid notification     |
| timer_update      | { remaining: number }        | Countdown update         |
| participant_joined| { participants: number }     | User joined              |
| participant_left  | { participants: number }     | User left                |
| auction_ended     | { winner, finalPrice }       | Auction complete         |
| error             | { message: string }          | Error message            |

## Security Features

1. **Authentication**
   - JWT tokens with 7-day expiration
   - HTTP-only cookies
   - bcrypt password hashing (12 rounds)

2. **Authorization**
   - Role-based access control (USER/ADMIN)
   - Middleware protection for routes
   - API route guards

3. **Payment Security**
   - Stripe Payment Intents
   - PCI-compliant payment flow
   - Webhook signature verification

4. **Auction Security**
   - Unique access codes per auction
   - Rate limiting on bids (2-second cooldown)
   - Bid validation (minimum increment)
   - Anonymized bidder names

5. **Data Protection**
   - Input validation with Zod
   - SQL injection protection (Prisma ORM)
   - XSS protection (React escaping)

## Deployment Guide

### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

```bash
# 1. Clone repository
git clone <repo-url>
cd am8-motors-auctions

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# 4. Initialize database
npx prisma generate
npx prisma db push
npm run db:seed

# 5. Build application
npm run build

# 6. Start production server
npm start
```

### Option 2: Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t am8-motors .
docker run -p 3000:3000 --env-file .env.local am8-motors
```

### Option 3: Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Note:** For WebSocket support on Vercel, use the custom server (`server.js`) or deploy to a platform that supports long-running processes.

### Option 4: Railway / Render

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | SQLite database path |
| JWT_SECRET | Yes | Secret for JWT signing |
| STRIPE_SECRET_KEY | Yes | Stripe secret key |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Yes | Stripe public key |
| SMTP_HOST | Yes | Email server host |
| SMTP_USER | Yes | Email username |
| SMTP_PASS | Yes | Email password |
| SMTP_PORT | No | Email port (default: 587) |
| EMAIL_FROM | No | Sender email address |
| NEXT_PUBLIC_SOCKET_URL | No | Socket.io server URL |
| HOSTNAME | No | Server hostname |
| PORT | No | Server port (default: 3000) |

## Performance Optimization

1. **Database**
   - Indexed bid queries by auctionId and amount
   - Connection pooling via Prisma
   - Consider PostgreSQL for high traffic

2. **Frontend**
   - Image optimization with Next.js Image
   - Code splitting via dynamic imports
   - Framer Motion for smooth animations

3. **WebSocket**
   - Room-based broadcasting
   - Rate limiting on bid submissions
   - Automatic reconnection

4. **Caching**
   - Static page generation where possible
   - API response caching
   - Image CDN for car photos

## Monitoring & Logging

- Console logging for errors
- Prisma query logging in development
- Consider integrating Sentry for error tracking
- Add analytics for user behavior

## Backup Strategy

```bash
# Backup SQLite database
cp prisma/dev.db backups/dev-$(date +%Y%m%d).db

# Automated backup cron job
0 2 * * * cp /path/to/prisma/dev.db /path/to/backups/dev-$(date +\%Y\%m\%d).db
```

## Scaling Considerations

1. **Database**: Migrate to PostgreSQL for concurrent connections
2. **WebSocket**: Use Redis adapter for multi-server deployments
3. **Images**: Implement CDN (Cloudflare, AWS S3 + CloudFront)
4. **Caching**: Add Redis for session and auction state caching
5. **Load Balancing**: Use NGINX or AWS ALB for traffic distribution
