import pool from "../config/db.js";
import { validateCheckpointInput, validateTeamInput } from "../utils/validators.js";

const mapTeam = (teamRow, memberRows, checkpointRows) => {
  if (!teamRow) {
    return null;
  }

  return {
    id: teamRow.id,
    teamName: teamRow.team_name,
    caseId: teamRow.case_id,
    caseTitle: teamRow.case_title,
    ownerUserId: teamRow.owner_user_id,
    createdAt: teamRow.created_at,
    members: memberRows.map((member) => ({
      id: member.id,
      fullName: member.full_name,
      phoneNumber: member.phone_number,
      gradeOrCourse: member.grade_or_course,
    })),
    checkpoints: checkpointRows.map((checkpoint) => ({
      code: checkpoint.code,
      title: checkpoint.title,
      description: checkpoint.description,
      requirementOrder: checkpoint.requirement_order,
      submissionUrl: checkpoint.submission_url,
      notes: checkpoint.notes,
      submittedAt: checkpoint.submitted_at,
      status: checkpoint.submission_url ? "submitted" : "pending",
    })),
  };
};

const fetchTeamBundle = async (userId) => {
  const [teamRows] = await pool.execute(
    `SELECT teams.*, business_cases.title AS case_title
     FROM teams
     JOIN business_cases ON business_cases.id = teams.case_id
     WHERE owner_user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (teamRows.length === 0) {
    return null;
  }

  const team = teamRows[0];

  const [memberRows] = await pool.execute(
    `SELECT id, full_name, phone_number, grade_or_course
     FROM team_members
     WHERE team_id = ?
     ORDER BY id ASC`,
    [team.id]
  );

  const [checkpointRows] = await pool.execute(
    `SELECT checkpoints.code, checkpoints.title, checkpoints.description, checkpoints.requirement_order,
            team_checkpoint_submissions.submission_url, team_checkpoint_submissions.notes, team_checkpoint_submissions.submitted_at
     FROM checkpoints
     LEFT JOIN team_checkpoint_submissions
       ON team_checkpoint_submissions.checkpoint_id = checkpoints.id
      AND team_checkpoint_submissions.team_id = ?
     ORDER BY checkpoints.requirement_order ASC`,
    [team.id]
  );

  return mapTeam(team, memberRows, checkpointRows);
};

export const getMyTeam = async (req, res) => {
  try {
    const team = await fetchTeamBundle(req.auth.user_id);
    return res.json({ team });
  } catch (error) {
    console.error("Get team error:", error);
    return res.status(500).json({ message: "Не удалось загрузить команду." });
  }
};

export const upsertTeam = async (req, res) => {
  const { errors, sanitized } = validateTeamInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed.", errors });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [caseRows] = await connection.execute(`SELECT id FROM business_cases WHERE id = ? LIMIT 1`, [
      sanitized.caseId,
    ]);

    if (caseRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Выбранный кейс не найден." });
    }

    const [existing] = await connection.execute(
      `SELECT id FROM teams WHERE owner_user_id = ? LIMIT 1`,
      [req.auth.user_id]
    );

    let teamId;

    if (existing.length > 0) {
      teamId = existing[0].id;
      await connection.execute(
        `UPDATE teams
         SET team_name = ?, case_id = ?, updated_at = NOW()
         WHERE id = ?`,
        [sanitized.teamName, sanitized.caseId, teamId]
      );
      await connection.execute(`DELETE FROM team_members WHERE team_id = ?`, [teamId]);
    } else {
      const [result] = await connection.execute(
        `INSERT INTO teams (owner_user_id, team_name, case_id)
         VALUES (?, ?, ?)`,
        [req.auth.user_id, sanitized.teamName, sanitized.caseId]
      );
      teamId = result.insertId;
    }

    for (const member of sanitized.members) {
      await connection.execute(
        `INSERT INTO team_members (team_id, full_name, phone_number, grade_or_course)
         VALUES (?, ?, ?, ?)`,
        [teamId, member.fullName, member.phoneNumber, member.gradeOrCourse]
      );
    }

    await connection.commit();
    const team = await fetchTeamBundle(req.auth.user_id);
    return res.json({ message: "Команда сохранена.", team });
  } catch (error) {
    await connection.rollback();
    console.error("Upsert team error:", error);
    return res.status(500).json({ message: "Не удалось сохранить команду." });
  } finally {
    connection.release();
  }
};

export const listCases = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, slug, title, summary
       FROM business_cases
       ORDER BY id ASC`
    );
    return res.json({ cases: rows });
  } catch (error) {
    console.error("List cases error:", error);
    return res.status(500).json({ message: "Не удалось загрузить кейсы." });
  }
};

export const listCheckpoints = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT code, title, description, requirement_order
       FROM checkpoints
       ORDER BY requirement_order ASC`
    );
    return res.json({ checkpoints: rows });
  } catch (error) {
    console.error("List checkpoints error:", error);
    return res.status(500).json({ message: "Не удалось загрузить чекпоинты." });
  }
};

export const submitCheckpoint = async (req, res) => {
  const { errors, sanitized } = validateCheckpointInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed.", errors });
  }

  try {
    const team = await fetchTeamBundle(req.auth.user_id);

    if (!team) {
      return res.status(400).json({ message: "Сначала зарегистрируйте команду." });
    }

    const [checkpointRows] = await pool.execute(
      `SELECT id, requirement_order FROM checkpoints WHERE code = ? LIMIT 1`,
      [req.params.code]
    );

    if (checkpointRows.length === 0) {
      return res.status(404).json({ message: "Checkpoint не найден." });
    }

    const checkpoint = checkpointRows[0];

    if (checkpoint.requirement_order > 1) {
      const [previousRows] = await pool.execute(
        `SELECT checkpoints.code, team_checkpoint_submissions.submission_url
         FROM checkpoints
         LEFT JOIN team_checkpoint_submissions
           ON team_checkpoint_submissions.checkpoint_id = checkpoints.id
          AND team_checkpoint_submissions.team_id = ?
         WHERE checkpoints.requirement_order = ? LIMIT 1`,
        [team.id, checkpoint.requirement_order - 1]
      );

      if (previousRows.length > 0 && !previousRows[0].submission_url) {
        return res.status(400).json({
          message: "Сначала завершите предыдущий checkpoint.",
        });
      }
    }

    await pool.execute(
      `INSERT INTO team_checkpoint_submissions (team_id, checkpoint_id, submission_url, notes, submitted_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         submission_url = VALUES(submission_url),
         notes = VALUES(notes),
         submitted_at = NOW()`,
      [team.id, checkpoint.id, sanitized.submissionUrl, sanitized.notes]
    );

    const updatedTeam = await fetchTeamBundle(req.auth.user_id);
    return res.json({ message: "Checkpoint сохранен.", team: updatedTeam });
  } catch (error) {
    console.error("Submit checkpoint error:", error);
    return res.status(500).json({ message: "Не удалось сохранить checkpoint." });
  }
};

