import pool from "../config/db.js";
import { validateJudgeScoreInput } from "../utils/validators.js";

const mapScore = (row) =>
  row
    ? {
        problemUnderstanding: row.problem_understanding,
        solutionQuality: row.solution_quality,
        innovation: row.innovation,
        feasibility: row.feasibility,
        prototypeMvp: row.prototype_mvp,
        pitchPresentation: row.pitch_presentation,
        totalScore: row.total_score,
        comments: row.comments || "",
        updatedAt: row.updated_at,
      }
    : null;

export const getJudgeDashboard = async (req, res) => {
  try {
    if (!req.auth.assigned_case_id) {
      return res.status(400).json({ message: "Для жюри не назначен кейс." });
    }

    const [caseRows] = await pool.execute(
      `SELECT id, title, summary FROM business_cases WHERE id = ? LIMIT 1`,
      [req.auth.assigned_case_id]
    );

    const [teamRows] = await pool.execute(
      `SELECT teams.id, teams.team_name, teams.created_at, users.full_name AS captain_name
       FROM teams
       JOIN users ON users.id = teams.owner_user_id
       WHERE teams.case_id = ?
       ORDER BY teams.team_name ASC`,
      [req.auth.assigned_case_id]
    );

    const teamIds = teamRows.map((team) => team.id);

    const [memberRows] = teamIds.length
      ? await pool.query(
          `SELECT team_id, full_name, grade_or_course
           FROM team_members
           WHERE team_id IN (?)
           ORDER BY team_id ASC, id ASC`,
          [teamIds]
        )
      : [[]];

    const [scoreRows] = teamIds.length
      ? await pool.query(
          `SELECT team_id, problem_understanding, solution_quality, innovation, feasibility,
                  prototype_mvp, pitch_presentation, total_score, comments, updated_at
           FROM judge_scores
           WHERE judge_user_id = ? AND team_id IN (?)`,
          [req.auth.user_id, teamIds]
        )
      : [[]];

    const teams = teamRows.map((team) => ({
      id: team.id,
      teamName: team.team_name,
      captainName: team.captain_name,
      createdAt: team.created_at,
      members: memberRows
        .filter((member) => member.team_id === team.id)
        .map((member) => ({
          fullName: member.full_name,
          gradeOrCourse: member.grade_or_course,
        })),
      score: mapScore(scoreRows.find((score) => score.team_id === team.id)),
    }));

    return res.json({
      assignedCase: caseRows[0] || null,
      teams,
      criteria: [
        { key: "problemUnderstanding", label: "Понимание проблемы", max: 15 },
        { key: "solutionQuality", label: "Качество решения", max: 20 },
        { key: "innovation", label: "Инновационность", max: 15 },
        { key: "feasibility", label: "Реализуемость", max: 20 },
        { key: "prototypeMvp", label: "Прототип / MVP", max: 15 },
        { key: "pitchPresentation", label: "Питч / Презентация", max: 15 },
      ],
    });
  } catch (error) {
    console.error("Judge dashboard error:", error);
    return res.status(500).json({ message: "Не удалось загрузить judge dashboard." });
  }
};

export const submitJudgeScore = async (req, res) => {
  const { errors, sanitized } = validateJudgeScoreInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed.", errors });
  }

  try {
    const [teamRows] = await pool.execute(
      `SELECT id FROM teams WHERE id = ? AND case_id = ? LIMIT 1`,
      [req.params.teamId, req.auth.assigned_case_id]
    );

    if (teamRows.length === 0) {
      return res.status(404).json({ message: "Команда для этого кейса не найдена." });
    }

    const totalScore =
      sanitized.problemUnderstanding +
      sanitized.solutionQuality +
      sanitized.innovation +
      sanitized.feasibility +
      sanitized.prototypeMvp +
      sanitized.pitchPresentation;

    await pool.execute(
      `INSERT INTO judge_scores (
         judge_user_id, team_id, problem_understanding, solution_quality, innovation,
         feasibility, prototype_mvp, pitch_presentation, total_score, comments
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         problem_understanding = VALUES(problem_understanding),
         solution_quality = VALUES(solution_quality),
         innovation = VALUES(innovation),
         feasibility = VALUES(feasibility),
         prototype_mvp = VALUES(prototype_mvp),
         pitch_presentation = VALUES(pitch_presentation),
         total_score = VALUES(total_score),
         comments = VALUES(comments),
         updated_at = NOW()`,
      [
        req.auth.user_id,
        req.params.teamId,
        sanitized.problemUnderstanding,
        sanitized.solutionQuality,
        sanitized.innovation,
        sanitized.feasibility,
        sanitized.prototypeMvp,
        sanitized.pitchPresentation,
        totalScore,
        sanitized.comments,
      ]
    );

    return res.json({ message: "Оценка сохранена.", totalScore });
  } catch (error) {
    console.error("Submit judge score error:", error);
    return res.status(500).json({ message: "Не удалось сохранить оценку." });
  }
};
