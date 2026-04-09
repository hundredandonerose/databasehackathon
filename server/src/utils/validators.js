import { gradeOptions } from "./constants.js";

const phoneRegex = /^[+]?[\d\s()-]{10,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^https?:\/\/.+/i;

const clean = (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");
const normalizeUrl = (value) => {
  const cleaned = clean(value);

  if (!cleaned) {
    return "";
  }

  if (urlRegex.test(cleaned)) {
    return cleaned;
  }

  if (/^[^\s]+\.[^\s]+/.test(cleaned)) {
    return `https://${cleaned}`;
  }

  return cleaned;
};

export const validateRegisterInput = (payload) => {
  const errors = {};
  const fullName = clean(payload.fullName);
  const email = clean(payload.email).toLowerCase();
  const phoneNumber = clean(payload.phoneNumber);
  const password = typeof payload.password === "string" ? payload.password : "";

  if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName = "Введите корректное имя.";
  }

  if (!emailRegex.test(email)) {
    errors.email = "Введите корректный email.";
  }

  if (!phoneRegex.test(phoneNumber)) {
    errors.phoneNumber = "Введите корректный номер телефона.";
  }

  if (password.length < 8) {
    errors.password = "Пароль должен быть не короче 8 символов.";
  }

  return {
    errors,
    sanitized: { fullName, email, phoneNumber, password },
  };
};

export const validateLoginInput = (payload) => {
  const errors = {};
  const email = clean(payload.email).toLowerCase();
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!emailRegex.test(email)) {
    errors.email = "Введите корректный email.";
  }

  if (!password) {
    errors.password = "Введите пароль.";
  }

  return {
    errors,
    sanitized: { email, password },
  };
};

export const validateTeamInput = (payload) => {
  const errors = {};
  const teamName = clean(payload.teamName);
  const caseId = Number(payload.caseId);
  const members = Array.isArray(payload.members) ? payload.members : [];

  if (teamName.length < 2 || teamName.length > 100) {
    errors.teamName = "Название команды должно быть от 2 до 100 символов.";
  }

  if (!Number.isInteger(caseId) || caseId < 1) {
    errors.caseId = "Выберите бизнес-кейс.";
  }

  if (members.length < 3 || members.length > 5) {
    errors.members = "В команде должно быть от 3 до 5 участников.";
  }

  const sanitizedMembers = members.map((member, index) => {
    const fullName = clean(member?.fullName);
    const phoneNumber = clean(member?.phoneNumber);
    const gradeOrCourse = clean(member?.gradeOrCourse).toLowerCase();

    if (fullName.length < 2 || fullName.length > 100) {
      errors[`members.${index}.fullName`] = "Введите ФИО участника.";
    }

    if (!phoneRegex.test(phoneNumber)) {
      errors[`members.${index}.phoneNumber`] = "Введите корректный номер телефона участника.";
    }

    if (!gradeOptions.includes(gradeOrCourse)) {
      errors[`members.${index}.gradeOrCourse`] = "Выберите Класс/Курс участника.";
    }

    return { fullName, phoneNumber, gradeOrCourse };
  });

  return {
    errors,
    sanitized: {
      teamName,
      caseId,
      members: sanitizedMembers,
    },
  };
};

export const validateCheckpointInput = (payload) => {
  const errors = {};
  const submissionUrl = normalizeUrl(payload.submissionUrl);
  const notes = clean(payload.notes);

  if (!urlRegex.test(submissionUrl)) {
    errors.submissionUrl = "Добавьте корректную ссылку.";
  }

  return {
    errors,
    sanitized: { submissionUrl, notes },
  };
};
