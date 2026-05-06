#!/bin/bash
set -e

echo "🚀 A/M-8 Motors Auctions - Setup Script"
echo "========================================"

# Check Node.js version
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "💾 Setting up database..."
npx prisma db push

# Seed database
echo "🌱 Seeding database..."
npx tsx prisma/seed.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Quick Start Commands:"
echo "   npm run dev        - Start development server"
echo "   npm start          - Start production server (with Socket.io)"
echo "   npm run db:studio  - Open Prisma Studio"
echo ""
echo "👤 Default Admin:"
echo "   Email: admin@am8motors.com"
echo "   Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Update .env.local with your credentials before running!"
