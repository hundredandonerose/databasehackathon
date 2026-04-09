import pool from "../config/db.js";
import { generateSessionToken, hashPassword, hashToken, verifyPassword } from "../utils/auth.js";
import { validateLoginInput, validateRegisterInput } from "../utils/validators.js";

const isAdminEmail = (email) =>
  Boolean(process.env.ADMIN_EMAIL) &&
  process.env.ADMIN_EMAIL.trim().toLowerCase() === email.trim().toLowerCase();

const createSession = async (userId) => {
  const token = generateSessionToken();
  await pool.execute(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 14 DAY))`,
    [userId, hashToken(token)]
  );
  return token;
};

export const register = async (req, res) => {
  const { errors, sanitized } = validateRegisterInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed.", errors });
  }

  try {
    const [existing] = await pool.execute(`SELECT id FROM users WHERE email = ? LIMIT 1`, [
      sanitized.email,
    ]);

    if (existing.length > 0) {
      return res.status(409).json({ message: "Пользователь с таким email уже существует." });
    }

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, is_admin)
       VALUES (?, ?, ?, ?, 'participant', ?)`,
      [
        sanitized.fullName,
        sanitized.email,
        sanitized.phoneNumber,
        hashPassword(sanitized.password),
        isAdminEmail(sanitized.email) ? 1 : 0,
      ]
    );

    const token = await createSession(result.insertId);

    return res.status(201).json({
      token,
      user: {
        id: result.insertId,
        fullName: sanitized.fullName,
        email: sanitized.email,
        phoneNumber: sanitized.phoneNumber,
        role: "participant",
        judgeCaseId: null,
        isAdmin: isAdminEmail(sanitized.email),
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Не удалось создать аккаунт." });
  }
};

export const login = async (req, res) => {
  const { errors, sanitized } = validateLoginInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed.", errors });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, full_name, email, phone_number, password_hash, role, is_admin, assigned_case_id
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [sanitized.email]
    );

    if (rows.length === 0 || !verifyPassword(sanitized.password, rows[0].password_hash)) {
      return res.status(401).json({ message: "Неверный email или пароль." });
    }

    if (isAdminEmail(rows[0].email) && !rows[0].is_admin) {
      await pool.execute(`UPDATE users SET is_admin = 1 WHERE id = ?`, [rows[0].id]);
      rows[0].is_admin = 1;
    }

    const token = await createSession(rows[0].id);

    return res.json({
      token,
      user: {
        id: rows[0].id,
        fullName: rows[0].full_name,
        email: rows[0].email,
        phoneNumber: rows[0].phone_number,
        role: rows[0].role || "participant",
        judgeCaseId: rows[0].assigned_case_id,
        isAdmin: Boolean(rows[0].is_admin),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Не удалось выполнить вход." });
  }
};

export const logout = async (req, res) => {
  try {
    await pool.execute(`DELETE FROM sessions WHERE token_hash = ?`, [hashToken(req.sessionToken)]);
    return res.json({ message: "Выход выполнен." });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Не удалось завершить сессию." });
  }
};

export const me = async (req, res) => {
  return res.json({
    user: {
      id: req.auth.user_id,
      fullName: req.auth.full_name,
      email: req.auth.email,
      phoneNumber: req.auth.phone_number,
      role: req.auth.role || "participant",
      judgeCaseId: req.auth.assigned_case_id,
      isAdmin: Boolean(req.auth.is_admin),
    },
  });
};
