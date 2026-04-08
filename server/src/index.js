import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import { initializeDatabase, testDatabaseConnection } from "./config/db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: clientUrl,
  })
);
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await testDatabaseConnection();
    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api", teamRoutes);
app.use("/api", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.listen(port, async () => {
  try {
    await initializeDatabase();
    await testDatabaseConnection();
    console.log(`Server running on http://localhost:${port}`);
    console.log("Database connection established.");
  } catch (error) {
    console.error("Server started, but database connection failed:", error.message);
  }
});
