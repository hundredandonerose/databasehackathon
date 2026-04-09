CREATE DATABASE IF NOT EXISTS youth_hackathon_kz;
USE youth_hackathon_kz;

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
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_sessions_token_hash (token_hash),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS business_cases (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_business_cases_slug (slug)
);

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
);

CREATE TABLE IF NOT EXISTS team_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(25) NOT NULL,
  grade_or_course VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  requirement_order TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_checkpoints_code (code)
);

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
);

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
);
