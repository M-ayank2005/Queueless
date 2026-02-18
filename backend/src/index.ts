import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for MVP, restrict in prod
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

import authRoutes from "./routes/authRoutes";
import businessRoutes from "./routes/businessRoutes";
import queueRoutes from "./routes/queueRoutes";

app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/queue", queueRoutes);

// Basic health check
app.get("/", (req, res) => {
  res.send("QueueLess Backend is running");
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  socket.on("join_business", (businessId) => {
      socket.join(`business_${businessId}`);
      console.log(`Socket ${socket.id} joined business_${businessId}`);
  });

  socket.on("join_queue", (queueId) => {
      socket.join(`queue_${queueId}`);
      console.log(`Socket ${socket.id} joined queue_${queueId}`);
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.set("io", io); // Make io accessible in controllers

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/queueless";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB via Mongoose");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
