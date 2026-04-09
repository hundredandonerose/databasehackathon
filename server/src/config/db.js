import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { caseSeeds, checkpointSeeds } from "../utils/constants.js";
import { hashPassword } from "../utils/auth.js";

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
        role VARCHAR(20) NOT NULL DEFAULT 'participant',
        is_admin TINYINT(1) NOT NULL DEFAULT 0,
        assigned_case_id INT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_users_email (email),
        CONSTRAINT fk_users_assigned_case FOREIGN KEY (assigned_case_id) REFERENCES business_cases(id) ON DELETE SET NULL
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

    const [roleColumns] = await bootstrapConnection.query(`
      SHOW COLUMNS FROM users LIKE 'role'
    `);

    if (roleColumns.length === 0) {
      await bootstrapConnection.query(`
        ALTER TABLE users
        ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'participant' AFTER password_hash
      `);
    }

    const [assignedCaseColumns] = await bootstrapConnection.query(`
      SHOW COLUMNS FROM users LIKE 'assigned_case_id'
    `);

    if (assignedCaseColumns.length === 0) {
      await bootstrapConnection.query(`
        ALTER TABLE users
        ADD COLUMN assigned_case_id INT UNSIGNED NULL AFTER is_admin
      `);
      await bootstrapConnection.query(`
        ALTER TABLE users
        ADD CONSTRAINT fk_users_assigned_case FOREIGN KEY (assigned_case_id) REFERENCES business_cases(id) ON DELETE SET NULL
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

    await bootstrapConnection.query(`
      CREATE TABLE IF NOT EXISTS judge_scores (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        judge_user_id INT UNSIGNED NOT NULL,
        team_id INT UNSIGNED NOT NULL,
        problem_understanding TINYINT UNSIGNED NOT NULL DEFAULT 0,
        solution_quality TINYINT UNSIGNED NOT NULL DEFAULT 0,
        innovation TINYINT UNSIGNED NOT NULL DEFAULT 0,
        feasibility TINYINT UNSIGNED NOT NULL DEFAULT 0,
        prototype_mvp TINYINT UNSIGNED NOT NULL DEFAULT 0,
        pitch_presentation TINYINT UNSIGNED NOT NULL DEFAULT 0,
        total_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
        comments TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_judge_team (judge_user_id, team_id),
        CONSTRAINT fk_judge_scores_judge FOREIGN KEY (judge_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_judge_scores_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
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

    if (process.env.JUDGE_TRIAL_EMAIL && process.env.JUDGE_TRIAL_PASSWORD) {
      const judgeCaseSlug = (process.env.JUDGE_TRIAL_CASE_SLUG || "case-1").trim();
      const [judgeCaseRows] = await bootstrapConnection.query(
        `SELECT id FROM business_cases WHERE slug = ? LIMIT 1`,
        [judgeCaseSlug]
      );

      if (judgeCaseRows.length > 0) {
        await bootstrapConnection.query(
          `INSERT INTO users (full_name, email, phone_number, password_hash, role, is_admin, assigned_case_id)
           VALUES (?, ?, ?, ?, 'judge', 0, ?)
           ON DUPLICATE KEY UPDATE
             full_name = VALUES(full_name),
             phone_number = VALUES(phone_number),
             password_hash = VALUES(password_hash),
             role = 'judge',
             assigned_case_id = VALUES(assigned_case_id)`,
          [
            process.env.JUDGE_TRIAL_FULL_NAME || "Judge Demo",
            process.env.JUDGE_TRIAL_EMAIL.trim().toLowerCase(),
            process.env.JUDGE_TRIAL_PHONE || "+77000000001",
            hashPassword(process.env.JUDGE_TRIAL_PASSWORD),
            judgeCaseRows[0].id,
          ]
        );
      }
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
