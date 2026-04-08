import crypto from "crypto";

export const hashPassword = (password) =>
  crypto.pbkdf2Sync(password, "hackathon-salt-v1", 100000, 64, "sha512").toString("hex");

export const verifyPassword = (password, passwordHash) =>
  hashPassword(password) === passwordHash;

export const generateSessionToken = () => crypto.randomBytes(32).toString("hex");

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

