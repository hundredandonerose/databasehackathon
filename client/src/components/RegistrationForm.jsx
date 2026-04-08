import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const phoneRegex = /^[+]?[\d\s()-]{10,20}$/;

const createMember = () => ({
  fullName: "",
  phoneNumber: "",
  gradeOrCourse: "",
});

const initialForm = {
  fullName: "",
  phoneNumber: "",
  role: "participant",
  teamName: "",
  teamSize: "3",
  participantMembers: [createMember(), createMember(), createMember()],
  gradeOrCourse: "",
};

function RegistrationForm({ texts }) {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isParticipant = useMemo(
    () => formData.role === "participant",
    [formData.role]
  );

  useEffect(() => {
    if (!isParticipant) {
      return;
    }

    const targetSize = Number(formData.teamSize);
    if (!Number.isInteger(targetSize) || targetSize < 3 || targetSize > 5) {
      return;
    }

    setFormData((current) => {
      if (current.participantMembers.length === targetSize) {
        return current;
      }

      const nextMembers = Array.from({ length: targetSize }, (_, index) => {
        return current.participantMembers[index] || createMember();
      });

      return {
        ...current,
        participantMembers: nextMembers,
      };
    });
  }, [formData.teamSize, isParticipant]);

  const validate = () => {
    const nextErrors = {};

    if (!isParticipant && !formData.gradeOrCourse.trim()) {
      nextErrors.gradeOrCourse = texts.validation.gradeRequired;
    }

    if (isParticipant) {
      if (!formData.teamName.trim()) {
        nextErrors.teamName = texts.validation.teamNameRequired;
      }

      const teamSize = Number(formData.teamSize);
      if (!Number.isInteger(teamSize) || teamSize < 3 || teamSize > 5) {
        nextErrors.teamSize = texts.validation.teamSizeRange;
      }

      if (formData.participantMembers.length !== teamSize) {
        nextErrors.participantMembers = texts.validation.membersRequired;
      }

      formData.participantMembers.forEach((member, index) => {
        if (!member.fullName.trim() || member.fullName.trim().length < 2) {
          nextErrors[`member-fullName-${index}`] = texts.validation.memberNameRequired;
        }

        if (!phoneRegex.test(member.phoneNumber.trim())) {
          nextErrors[`member-phoneNumber-${index}`] = texts.validation.memberPhoneRequired;
        }

        if (!member.gradeOrCourse.trim()) {
          nextErrors[`member-gradeOrCourse-${index}`] = texts.validation.memberGradeRequired;
        }
      });
    } else {
      if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
        nextErrors.fullName = texts.validation.fullNameRequired;
      }

      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        nextErrors.phoneNumber = texts.validation.phoneRequired;
      }
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => {
      if (name === "role" && value === "volunteer") {
        return {
          ...current,
          role: value,
          teamName: "",
          teamSize: "",
          participantMembers: [],
        };
      }

      if (name === "role" && value === "participant") {
        return {
          ...current,
          role: value,
          teamSize: current.teamSize || "3",
          participantMembers:
            current.participantMembers.length > 0
              ? current.participantMembers
              : [createMember(), createMember(), createMember()],
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));
    setStatus({ type: "", message: "" });
  };

  const handleMemberChange = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      participantMembers: current.participantMembers.map((member, memberIndex) =>
        memberIndex === index
          ? {
              ...member,
              [field]: value,
            }
          : member
      ),
    }));

    setErrors((current) => ({
      ...current,
      [`member-${field}-${index}`]: "",
      participantMembers: "",
    }));
    setStatus({ type: "", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus({
        type: "error",
        message: texts.validation.fixErrors,
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    const payload = {
      ...formData,
      teamSize: formData.teamSize ? Number(formData.teamSize) : null,
      fullName: isParticipant ? "" : formData.fullName,
      phoneNumber: isParticipant ? "" : formData.phoneNumber,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/registrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || texts.messages.error);
      }

      setFormData(initialForm);
      setErrors({});
      setStatus({
        type: "success",
        message: texts.messages.success,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || texts.messages.error,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="registration-form" onSubmit={handleSubmit} noValidate>
      <div className="role-toggle" role="radiogroup" aria-label={texts.roleGroupLabel}>
        {[
          { value: "participant", label: texts.roles.participant },
          { value: "volunteer", label: texts.roles.volunteer },
        ].map((role) => (
          <label
            key={role.value}
            className={`role-toggle__option ${
              formData.role === role.value ? "is-active" : ""
            }`}
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              checked={formData.role === role.value}
              onChange={handleChange}
            />
            <span>{role.label}</span>
          </label>
        ))}
      </div>

      <div className="form-grid">
        {!isParticipant ? (
          <>
            <label className="field">
              <span>{texts.fields.fullName}</span>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder={texts.placeholders.fullName}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName ? <small className="field-error">{errors.fullName}</small> : null}
            </label>

            <label className="field">
              <span>{texts.fields.phoneNumber}</span>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder={texts.placeholders.phoneNumber}
                aria-invalid={Boolean(errors.phoneNumber)}
              />
              {errors.phoneNumber ? (
                <small className="field-error">{errors.phoneNumber}</small>
              ) : null}
            </label>
          </>
        ) : null}

        {isParticipant ? (
          <>
            <label className="field">
              <span>{texts.fields.teamName}</span>
              <input
                type="text"
                name="teamName"
                value={formData.teamName}
                onChange={handleChange}
                placeholder={texts.placeholders.teamName}
                aria-invalid={Boolean(errors.teamName)}
              />
              {errors.teamName ? (
                <small className="field-error">{errors.teamName}</small>
              ) : null}
            </label>

            <label className="field">
              <span>{texts.fields.teamSize}</span>
              <input
                type="number"
                name="teamSize"
                min="3"
                max="5"
                value={formData.teamSize}
                onChange={handleChange}
                placeholder="3"
                aria-invalid={Boolean(errors.teamSize)}
              />
              <small className="field-note">{texts.teamSizeNote}</small>
              {errors.teamSize ? (
                <small className="field-error">{errors.teamSize}</small>
              ) : null}
            </label>
          </>
        ) : null}

        {!isParticipant ? (
          <label className="field field--full">
            <span>{texts.fields.gradeOrCourse}</span>
            <select
              name="gradeOrCourse"
              value={formData.gradeOrCourse}
              onChange={handleChange}
              aria-invalid={Boolean(errors.gradeOrCourse)}
            >
              <option value="">{texts.placeholders.gradeOrCourse}</option>
              {texts.gradeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="field-note">{texts.gradeNote}</small>
            {errors.gradeOrCourse ? (
              <small className="field-error">{errors.gradeOrCourse}</small>
            ) : null}
          </label>
        ) : null}
      </div>

      {isParticipant ? (
        <div className="members-section">
          <div className="members-section__header">
            <h3>{texts.members.title}</h3>
            <p>{texts.members.description}</p>
          </div>

          {errors.participantMembers ? (
            <div className="form-status form-status--error">{errors.participantMembers}</div>
          ) : null}

          <div className="members-grid">
            {formData.participantMembers.map((member, index) => (
              <article key={index} className="member-card">
                <h4>
                  {texts.members.memberLabel} {index + 1}
                </h4>

                <label className="field">
                  <span>{texts.fields.memberFullName}</span>
                  <input
                    type="text"
                    value={member.fullName}
                    onChange={(event) =>
                      handleMemberChange(index, "fullName", event.target.value)
                    }
                    placeholder={texts.placeholders.memberFullName}
                    aria-invalid={Boolean(errors[`member-fullName-${index}`])}
                  />
                  {errors[`member-fullName-${index}`] ? (
                    <small className="field-error">
                      {errors[`member-fullName-${index}`]}
                    </small>
                  ) : null}
                </label>

                <label className="field">
                  <span>{texts.fields.memberPhoneNumber}</span>
                  <input
                    type="tel"
                    value={member.phoneNumber}
                    onChange={(event) =>
                      handleMemberChange(index, "phoneNumber", event.target.value)
                    }
                    placeholder={texts.placeholders.memberPhoneNumber}
                    aria-invalid={Boolean(errors[`member-phoneNumber-${index}`])}
                  />
                  {errors[`member-phoneNumber-${index}`] ? (
                    <small className="field-error">
                      {errors[`member-phoneNumber-${index}`]}
                    </small>
                  ) : null}
                </label>

                <label className="field">
                  <span>{texts.fields.memberGradeOrCourse}</span>
                  <select
                    value={member.gradeOrCourse}
                    onChange={(event) =>
                      handleMemberChange(index, "gradeOrCourse", event.target.value)
                    }
                    aria-invalid={Boolean(errors[`member-gradeOrCourse-${index}`])}
                  >
                    <option value="">{texts.placeholders.memberGradeOrCourse}</option>
                    {texts.gradeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="field-note">{texts.gradeNoteShort}</small>
                  {errors[`member-gradeOrCourse-${index}`] ? (
                    <small className="field-error">
                      {errors[`member-gradeOrCourse-${index}`]}
                    </small>
                  ) : null}
                </label>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {status.message ? (
        <div className={`form-status form-status--${status.type}`}>{status.message}</div>
      ) : null}

      <button type="submit" className="button button--primary" disabled={isSubmitting}>
        {isSubmitting ? texts.buttons.submitting : texts.buttons.submit}
      </button>
    </form>
  );
}

export default RegistrationForm;
