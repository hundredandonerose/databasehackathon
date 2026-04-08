import pool from "../config/db.js";
import { hashToken } from "../utils/auth.js";

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Требуется авторизация." });
  }

  try {
    const tokenHash = hashToken(token);
    const [rows] = await pool.execute(
      `SELECT sessions.id, sessions.user_id, users.full_name, users.email, users.phone_number, users.is_admin
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Сессия недействительна." });
    }

    req.auth = rows[0];
    req.sessionToken = token;
    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Ошибка авторизации." });
  }
};

export const requireAdmin = async (req, res, next) => {
  if (!req.auth?.is_admin) {
    return res.status(403).json({ message: "Доступ только для администратора." });
  }

  return next();
};
