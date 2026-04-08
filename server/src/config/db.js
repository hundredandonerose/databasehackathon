import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { caseSeeds, checkpointSeeds } from "../utils/constants.js";

dotenv.config();

const dbName = process.env.DB_NAME || "youth_hackathon_kz";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const initializeDatabase = async () => {
  const bootstrapConnection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  try {
    await bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await bootstrapConnection.query(`USE \`${dbName}\``);
    await bootstrapConnection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(190) NOT NULL,
        phone_number VARCHAR(25) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_users_email (email)
      )
    `);

    const [adminColumns] = await bootstrapConnection.query(`
      SHOW COLUMNS FROM users LIKE 'is_admin'
    `);

    if (adminColumns.length === 0) {
      await bootstrapConnection.query(`
        ALTER TABLE users
        ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash
      `);
    }

    await bootstrapConnection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_sessions_token_hash (token_hash),
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await bootstrapConnection.query(`
      CREATE TABLE IF NOT EXISTS business_cases (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        slug VARCHAR(64) NOT NULL,
        title VARCHAR(120) NOT NULL,
        summary TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_business_cases_slug (slug)
      )
    `);

    await bootstrapConnection.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        owner_user_id INT UNSIGNED NOT NULL,
        team_name VARCHAR(100) NOT NULL,
        case_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_teams_owner_user_id (owner_user_id),
        CONSTRAINT fk_teams_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_teams_case FOREIGN KEY (case_id) REFERENCES business_cases(id)
      )
    `);

    await bootstrapConnection.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        team_id INT UNSIGNED NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(25) NOT NULL,
        grade_or_course VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);

    await bootstrapConnection.query(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(64) NOT NULL,
        title VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        requirement_order TINYINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_checkpoints_code (code)
      )
    `);

    await bootstrapConnection.query(`
      CREATE TABLE IF NOT EXISTS team_checkpoint_submissions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        team_id INT UNSIGNED NOT NULL,
        checkpoint_id INT UNSIGNED NOT NULL,
        submission_url TEXT NOT NULL,
        notes TEXT NULL,
        submitted_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_team_checkpoint (team_id, checkpoint_id),
        CONSTRAINT fk_team_checkpoint_submissions_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        CONSTRAINT fk_team_checkpoint_submissions_checkpoint FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE
      )
    `);

    for (const seed of caseSeeds) {
      await bootstrapConnection.query(
        `INSERT INTO business_cases (slug, title, summary)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary)`,
        [seed.slug, seed.title, seed.summary]
      );
    }

    for (const seed of checkpointSeeds) {
      await bootstrapConnection.query(
        `INSERT INTO checkpoints (code, title, description, requirement_order)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           description = VALUES(description),
           requirement_order = VALUES(requirement_order)`,
        [seed.code, seed.title, seed.description, seed.requirement_order]
      );
    }

    if (process.env.ADMIN_EMAIL) {
      await bootstrapConnection.query(`UPDATE users SET is_admin = 1 WHERE email = ?`, [
        process.env.ADMIN_EMAIL.trim().toLowerCase(),
      ]);
    }
  } finally {
    await bootstrapConnection.end();
  }
};

export const testDatabaseConnection = async () => {
  const connection = await pool.getConnection();
  connection.release();
};

export default pool;
