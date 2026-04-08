import pool from "../config/db.js";

export const getAdminOverview = async (_req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, full_name, email, phone_number, is_admin, created_at
       FROM users
       ORDER BY created_at ASC`
    );

    const [teams] = await pool.query(
      `SELECT teams.id, teams.team_name, teams.created_at, teams.updated_at,
              users.full_name AS owner_name, users.email AS owner_email,
              business_cases.title AS case_title
       FROM teams
       JOIN users ON users.id = teams.owner_user_id
       JOIN business_cases ON business_cases.id = teams.case_id
       ORDER BY teams.updated_at DESC`
    );

    const [members] = await pool.query(
      `SELECT team_members.team_id, team_members.full_name, team_members.phone_number, team_members.grade_or_course
       FROM team_members
       ORDER BY team_members.team_id ASC, team_members.id ASC`
    );

    const [checkpointRows] = await pool.query(
      `SELECT teams.id AS team_id, checkpoints.code, checkpoints.title, checkpoints.requirement_order,
              team_checkpoint_submissions.submission_url, team_checkpoint_submissions.notes, team_checkpoint_submissions.submitted_at
       FROM teams
       CROSS JOIN checkpoints
       LEFT JOIN team_checkpoint_submissions
         ON team_checkpoint_submissions.team_id = teams.id
        AND team_checkpoint_submissions.checkpoint_id = checkpoints.id
       ORDER BY teams.id ASC, checkpoints.requirement_order ASC`
    );

    const teamsWithDetails = teams.map((team) => ({
      id: team.id,
      teamName: team.team_name,
      ownerName: team.owner_name,
      ownerEmail: team.owner_email,
      caseTitle: team.case_title,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      members: members
        .filter((member) => member.team_id === team.id)
        .map((member) => ({
          fullName: member.full_name,
          phoneNumber: member.phone_number,
          gradeOrCourse: member.grade_or_course,
        })),
      checkpoints: checkpointRows
        .filter((checkpoint) => checkpoint.team_id === team.id)
        .map((checkpoint) => ({
          code: checkpoint.code,
          title: checkpoint.title,
          requirementOrder: checkpoint.requirement_order,
          submitted: Boolean(checkpoint.submission_url),
          submissionUrl: checkpoint.submission_url,
          notes: checkpoint.notes,
          submittedAt: checkpoint.submitted_at,
        })),
    }));

    return res.json({
      users: users.map((user) => ({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        isAdmin: Boolean(user.is_admin),
        createdAt: user.created_at,
      })),
      teams: teamsWithDetails,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return res.status(500).json({ message: "Не удалось загрузить admin overview." });
  }
};

