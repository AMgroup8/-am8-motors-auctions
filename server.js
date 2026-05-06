import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const prisma = new PrismaClient();

// In-memory rate limiter for bidding
const bidRateLimiter = new Map();
const RATE_LIMIT_WINDOW = 2000; // 2 seconds between bids

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Auction rooms management
  const auctionRooms = new Map(); // auctionId -> { sockets, timer, currentBid }

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate socket
    socket.on("authenticate", async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "am8-secret-key-2024") as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        socket.authenticated = true;
        socket.emit("authenticated", { success: true });
      } catch (err) {
        socket.emit("authenticated", { success: false, error: "Invalid token" });
      }
    });

    // Join auction room
    socket.on("join_auction", async (data) => {
      const { auctionId, accessCode } = data;

      if (!socket.authenticated) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      try {
        // Verify access code
        const accessCodeRecord = await prisma.accessCode.findFirst({
          where: {
            code: accessCode,
            userId: socket.userId,
            auctionId: auctionId,
            used: false,
            expiresAt: { gt: new Date() },
          },
        });

        if (!accessCodeRecord) {
          socket.emit("error", { message: "Invalid or expired access code" });
          return;
        }

        // Mark access code as used
        await prisma.accessCode.update({
          where: { id: accessCodeRecord.id },
          data: { used: true },
        });

        // Join room
        socket.join(`auction_${auctionId}`);

        // Get auction data
        const auction = await prisma.auction.findUnique({
          where: { id: auctionId },
          include: {
            car: true,
            bids: {
              orderBy: { amount: "desc" },
              take: 1,
              include: { user: { select: { id: true, name: true } } },
            },
          },
        });

        if (!auction) {
          socket.emit("error", { message: "Auction not found" });
          return;
        }

        // Initialize room if not exists
        if (!auctionRooms.has(auctionId)) {
          auctionRooms.set(auctionId, {
            sockets: new Set(),
            currentBid: auction.currentBid || auction.startingPrice,
            highestBidder: auction.bids[0]?.user || null,
            endTime: auction.endTime,
            timer: null,
          });
        }

        const room = auctionRooms.get(auctionId);
        room.sockets.add(socket.id);

        // Send current state
        socket.emit("auction_state", {
          auctionId,
          currentBid: room.currentBid,
          highestBidder: room.highestBidder
            ? { id: room.highestBidder.id, name: maskName(room.highestBidder.name) }
            : null,
          endTime: room.endTime,
          car: auction.car,
          participants: room.sockets.size,
        });

        // Notify others
        socket.to(`auction_${auctionId}`).emit("participant_joined", {
          participants: room.sockets.size,
        });

        // Start countdown if auction is active
        if (auction.status === "ACTIVE" && !room.timer) {
          startAuctionTimer(auctionId, room, io);
        }
      } catch (error) {
        console.error("Join auction error:", error);
        socket.emit("error", { message: "Failed to join auction" });
      }
    });

    // Place bid
    socket.on("place_bid", async (data) => {
      const { auctionId, amount } = data;

      if (!socket.authenticated) {
        socket.emit("bid_error", { message: "Not authenticated" });
        return;
      }

      // Rate limiting
      const now = Date.now();
      const lastBid = bidRateLimiter.get(socket.userId);
      if (lastBid && now - lastBid < RATE_LIMIT_WINDOW) {
        socket.emit("bid_error", { message: "Please wait before placing another bid" });
        return;
      }

      try {
        const room = auctionRooms.get(auctionId);
        if (!room) {
          socket.emit("bid_error", { message: "Auction room not found" });
          return;
        }

        const auction = await prisma.auction.findUnique({
          where: { id: auctionId },
        });

        if (!auction || auction.status !== "ACTIVE") {
          socket.emit("bid_error", { message: "Auction is not active" });
          return;
        }

        const minBid = room.currentBid + (auction.minBidIncrement || 100);
        if (amount < minBid) {
          socket.emit("bid_error", { message: `Minimum bid is ${minBid} AED` });
          return;
        }

        // Create bid in database
        const bid = await prisma.bid.create({
          data: {
            amount,
            auctionId,
            userId: socket.userId,
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });

        // Update room state
        room.currentBid = amount;
        room.highestBidder = bid.user;
        bidRateLimiter.set(socket.userId, now);

        // Broadcast to all in room
        io.to(`auction_${auctionId}`).emit("new_bid", {
          amount,
          bidder: { id: bid.user.id, name: maskName(bid.user.name) },
          timestamp: new Date().toISOString(),
        });

        // Send outbid notification to previous highest bidder
        if (room.highestBidder && room.highestBidder.id !== socket.userId) {
          // This would be handled by a separate notification system
        }

        socket.emit("bid_success", { amount });
      } catch (error) {
        console.error("Place bid error:", error);
        socket.emit("bid_error", { message: "Failed to place bid" });
      }
    });

    // Leave auction
    socket.on("leave_auction", (auctionId) => {
      socket.leave(`auction_${auctionId}`);
      const room = auctionRooms.get(auctionId);
      if (room) {
        room.sockets.delete(socket.id);
        io.to(`auction_${auctionId}`).emit("participant_left", {
          participants: room.sockets.size,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Clean up rooms
      auctionRooms.forEach((room, auctionId) => {
        if (room.sockets.has(socket.id)) {
          room.sockets.delete(socket.id);
          io.to(`auction_${auctionId}`).emit("participant_left", {
            participants: room.sockets.size,
          });
        }
      });
    });
  });

  // Start auction timer
  function startAuctionTimer(auctionId, room, io) {
    const checkStatus = async () => {
      const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
      });

      if (!auction || auction.status !== "ACTIVE") {
        clearInterval(room.timer);
        room.timer = null;
        return;
      }

      const now = new Date();
      const endTime = new Date(auction.endTime);
      const remaining = endTime.getTime() - now.getTime();

      if (remaining <= 0) {
        // Auction ended
        clearInterval(room.timer);
        room.timer = null;

        // Determine winner
        const highestBid = await prisma.bid.findFirst({
          where: { auctionId },
          orderBy: { amount: "desc" },
          include: { user: true },
        });

        if (highestBid) {
          // Create winner record
          await prisma.winner.create({
            data: {
              auctionId,
              userId: highestBid.userId,
              finalPrice: highestBid.amount,
              status: "PENDING",
            },
          });

          // Update auction status
          await prisma.auction.update({
            where: { id: auctionId },
            data: { status: "ENDED", currentBid: highestBid.amount },
          });

          // Notify winner
          io.to(`auction_${auctionId}`).emit("auction_ended", {
            winner: { id: highestBid.user.id, name: maskName(highestBid.user.name) },
            finalPrice: highestBid.amount,
          });

          // Send winner email (async)
          sendWinnerEmail(highestBid.user, auctionId, highestBid.amount);
        } else {
          await prisma.auction.update({
            where: { id: auctionId },
            data: { status: "ENDED" },
          });
          io.to(`auction_${auctionId}`).emit("auction_ended", { winner: null });
        }
      } else {
        // Broadcast remaining time
        io.to(`auction_${auctionId}`).emit("timer_update", {
          remaining: Math.ceil(remaining / 1000),
        });
      }
    };

    room.timer = setInterval(checkStatus, 1000);
  }

  // Helper: mask bidder name
  function maskName(name) {
    if (!name) return "Anonymous";
    const parts = name.split(" ");
    return parts.map((p) => p[0] + "***").join(" ");
  }

  // Helper: send winner email
  async function sendWinnerEmail(user, auctionId, amount) {
    // This will be handled by the email service
    // For now, just log
    console.log(`Winner email should be sent to ${user.email} for auction ${auctionId} at ${amount} AED`);
  }

  // Admin namespace
  const adminIo = io.of("/admin");
  adminIo.on("connection", (socket) => {
    socket.on("authenticate", async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "am8-secret-key-2024") as any;
        if (decoded.role !== "ADMIN") {
          socket.emit("authenticated", { success: false, error: "Admin access required" });
          return;
        }
        socket.userId = decoded.userId;
        socket.authenticated = true;
        socket.emit("authenticated", { success: true });
      } catch (err) {
        socket.emit("authenticated", { success: false, error: "Invalid token" });
      }
    });

    socket.on("monitor_auction", (auctionId) => {
      if (!socket.authenticated) return;
      socket.join(`admin_auction_${auctionId}`);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
