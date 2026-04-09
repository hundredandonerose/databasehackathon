import { useEffect, useMemo, useState } from "react";
import Countdown from "./components/Countdown";
import Navbar from "./components/Navbar";
import SectionHeading from "./components/SectionHeading";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const countdownTarget = new Date("2026-06-06T09:00:00+05:00");

const languages = [{ code: "ru", label: "РУС" }];

const navLinks = [
  { href: "#hero", label: "Главная" },
  { href: "#about", label: "О хакатоне" },
  { href: "#venue", label: "Локация" },
  { href: "#details", label: "Детали" },
  { href: "#portal", label: "Portal" },
];

const gradeOptions = [
  { value: "10 grade", label: "10 класс" },
  { value: "11 grade", label: "11 класс" },
  { value: "12 grade", label: "12 класс" },
  { value: "1 course", label: "1 курс" },
  { value: "2 course", label: "2 курс" },
];

const countdownTexts = {
  completeBadge: "Кейсы доступны",
  completeTitle: "Бизнес-кейсы опубликованы",
  completeText: "После входа в аккаунт команда увидит кейсы и сможет выбрать один из трех.",
  units: {
    days: "Дни",
    hours: "Часы",
    minutes: "Минуты",
    seconds: "Секунды",
  },
};

const publicCases = [
  "Команда выбирает 1 из 3 бизнес-кейсов.",
  "Длительность хакатона: 24 часа.",
  "Все 3 checkpoint'а обязательны для завершения.",
];

const sponsors = [
  { name: "abr", logo: "/sponsors/abr_logo.png", alt: "abr logo", className: "sponsor-teaser__logo-image sponsor-teaser__logo-image--dark" },
  { name: "ALT University", logo: "/sponsors/alt_university.jpeg", alt: "ALT University logo", className: "sponsor-teaser__logo-image" },
  { name: "Alatau City Bank", logo: "/sponsors/nis.webp", alt: "Alatau City Bank logo", className: "sponsor-teaser__logo-image" },
  { name: "Kcell", logo: "/sponsors/kcell.png", alt: "Kcell logo", className: "sponsor-teaser__logo-image" },
];

const checkpointLabels = {
  "checkpoint-1": "15:00 - 15:30",
  "checkpoint-2": "22:00 - 22:30",
  "checkpoint-3": "08:00 - 09:30",
};

const createMember = () => ({
  fullName: "",
  phoneNumber: "",
  gradeOrCourse: "",
});

const createTeamForm = (size = 3) => ({
  teamName: "",
  caseId: "",
  members: Array.from({ length: size }, () => createMember()),
});

const judgeCriteriaFallback = [
  { key: "problemUnderstanding", label: "Понимание проблемы", max: 15 },
  { key: "solutionQuality", label: "Качество решения", max: 20 },
  { key: "innovation", label: "Инновационность", max: 15 },
  { key: "feasibility", label: "Реализуемость", max: 20 },
  { key: "prototypeMvp", label: "Прототип / MVP", max: 15 },
  { key: "pitchPresentation", label: "Питч / Презентация", max: 15 },
];

const createJudgeDraft = (score) => ({
  problemUnderstanding: score?.problemUnderstanding != null ? String(score.problemUnderstanding) : "",
  solutionQuality: score?.solutionQuality != null ? String(score.solutionQuality) : "",
  innovation: score?.innovation != null ? String(score.innovation) : "",
  feasibility: score?.feasibility != null ? String(score.feasibility) : "",
  prototypeMvp: score?.prototypeMvp != null ? String(score.prototypeMvp) : "",
  pitchPresentation: score?.pitchPresentation != null ? String(score.pitchPresentation) : "",
  comments: score?.comments ?? "",
});

function App() {
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("hackathon_token") || "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("register");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [authErrors, setAuthErrors] = useState({});
  const [authStatus, setAuthStatus] = useState("");
  const [teamForm, setTeamForm] = useState(() => createTeamForm());
  const [teamErrors, setTeamErrors] = useState({});
  const [teamStatus, setTeamStatus] = useState("");
  const [cases, setCases] = useState([]);
  const [team, setTeam] = useState(null);
  const [checkpointsMeta, setCheckpointsMeta] = useState([]);
  const [checkpointDrafts, setCheckpointDrafts] = useState({});
  const [checkpointStatus, setCheckpointStatus] = useState("");
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminStatus, setAdminStatus] = useState("");
  const [judgeDashboard, setJudgeDashboard] = useState(null);
  const [judgeStatus, setJudgeStatus] = useState("");
  const [judgeDrafts, setJudgeDrafts] = useState({});
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isTeamSaving, setIsTeamSaving] = useState(false);
  const [savingCheckpointCode, setSavingCheckpointCode] = useState("");
  const [savingJudgeTeamId, setSavingJudgeTeamId] = useState("");

  const teamSize = useMemo(() => teamForm.members.length, [teamForm.members.length]);
  const isJudge = user?.role === "judge";

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsNavHidden(currentScrollY > 140 && currentScrollY > lastScrollY);
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setTeam(null);
      setAdminOverview(null);
      setJudgeDashboard(null);
      return;
    }

    const bootstrap = async () => {
      try {
        const meData = await apiRequest("/auth/me", "GET", null, token);

        setUser(meData.user);
        if (meData.user?.role === "judge") {
          const judgeData = await apiRequest("/judge/dashboard", "GET", null, token);
          setJudgeDashboard(judgeData);
          setJudgeDrafts(
            Object.fromEntries(
              (judgeData.teams || []).map((teamItem) => [
                teamItem.id,
                createJudgeDraft(teamItem.score),
              ])
            )
          );
          setCases([]);
          setCheckpointsMeta([]);
          applyTeamState(null);
          setAdminOverview(null);
          setAdminStatus("");
          return;
        }

        const [casesData, checkpointsData, teamData] = await Promise.all([
          apiRequest("/cases", "GET", null, token),
          apiRequest("/checkpoints", "GET", null, token),
          apiRequest("/my-team", "GET", null, token),
        ]);

        setJudgeDashboard(null);
        setJudgeDrafts({});
        setCases(casesData.cases || []);
        setCheckpointsMeta(checkpointsData.checkpoints || []);
        applyTeamState(teamData.team);

        if (meData.user?.isAdmin) {
          try {
            const adminData = await apiRequest("/admin/overview", "GET", null, token);
            setAdminOverview(adminData);
            setAdminStatus("");
          } catch (adminError) {
            setAdminOverview(null);
            setAdminStatus(adminError.message || "Не удалось загрузить admin dashboard.");
          }
        } else {
          setAdminOverview(null);
          setAdminStatus("");
        }
      } catch (error) {
        localStorage.removeItem("hackathon_token");
        setToken("");
        setAuthStatus(error.message || "Сессия истекла.");
      }
    };

    bootstrap();
  }, [token]);

  const applyTeamState = (teamData) => {
    setTeam(teamData || null);

    if (teamData) {
      setTeamForm({
        teamName: teamData.teamName,
        caseId: String(teamData.caseId),
        members: teamData.members.map((member) => ({
          fullName: member.fullName,
          phoneNumber: member.phoneNumber,
          gradeOrCourse: member.gradeOrCourse,
        })),
      });

      const nextDrafts = {};
      (teamData.checkpoints || []).forEach((checkpoint) => {
        nextDrafts[checkpoint.code] = {
          submissionUrl: checkpoint.submissionUrl || "",
          notes: checkpoint.notes || "",
        };
      });
      setCheckpointDrafts(nextDrafts);
    } else {
      setTeamForm(createTeamForm());
      setCheckpointDrafts({});
    }
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
    setAuthErrors((current) => ({ ...current, [name]: "" }));
    setAuthStatus("");
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthErrors({});
    setAuthStatus("");

    try {
      const payload =
        authMode === "register"
          ? authForm
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const data = await apiRequest(`/auth/${authMode}`, "POST", payload);
      localStorage.setItem("hackathon_token", data.token);
      setToken(data.token);
      setAuthForm({
        fullName: "",
        email: "",
        phoneNumber: "",
        password: "",
      });
    } catch (error) {
      setAuthErrors(error.errors || {});
      setAuthStatus(error.message || "Не удалось выполнить действие.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest("/auth/logout", "POST", {}, token);
      }
    } catch (_error) {
      // ignore logout server errors and clear locally
    } finally {
      localStorage.removeItem("hackathon_token");
      setToken("");
      setUser(null);
      setCases([]);
      setCheckpointsMeta([]);
      setAdminOverview(null);
      setAdminStatus("");
      setJudgeDashboard(null);
      setJudgeStatus("");
      setJudgeDrafts({});
      applyTeamState(null);
    }
  };

  const updateTeamSize = (nextSize) => {
    const numericSize = Number(nextSize);
    if (!Number.isInteger(numericSize) || numericSize < 3 || numericSize > 5) {
      return;
    }

    setTeamForm((current) => ({
      ...current,
      members: Array.from({ length: numericSize }, (_, index) => current.members[index] || createMember()),
    }));
  };

  const handleTeamChange = (event) => {
    const { name, value } = event.target;

    if (name === "teamSize") {
      updateTeamSize(value);
    } else {
      setTeamForm((current) => ({ ...current, [name]: value }));
    }

    setTeamErrors({});
    setTeamStatus("");
  };

  const handleMemberChange = (index, field, value) => {
    setTeamForm((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      ),
    }));
    setTeamErrors({});
    setTeamStatus("");
  };

  const saveTeam = async (event) => {
    event.preventDefault();
    setIsTeamSaving(true);
    setTeamErrors({});
    setTeamStatus("");

    try {
      const data = await apiRequest(
        "/my-team",
        "POST",
        {
          teamName: teamForm.teamName,
          caseId: Number(teamForm.caseId),
          members: teamForm.members,
        },
        token
      );

      applyTeamState(data.team);
      setTeamStatus(data.message);
    } catch (error) {
      setTeamErrors(error.errors || {});
      setTeamStatus(error.message || "Не удалось сохранить команду.");
    } finally {
      setIsTeamSaving(false);
    }
  };

  const handleCheckpointDraft = (code, field, value) => {
    setCheckpointDrafts((current) => ({
      ...current,
      [code]: {
        submissionUrl: current[code]?.submissionUrl || "",
        notes: current[code]?.notes || "",
        [field]: value,
      },
    }));
    setCheckpointStatus("");
  };

  const submitCheckpoint = async (code) => {
    setSavingCheckpointCode(code);
    setCheckpointStatus("");

    try {
      const draft = checkpointDrafts[code] || { submissionUrl: "", notes: "" };
      const data = await apiRequest(`/checkpoints/${code}`, "PUT", draft, token);
      applyTeamState(data.team);
      setCheckpointStatus(data.message);
    } catch (error) {
      setCheckpointStatus(error.errors?.submissionUrl || error.message || "Не удалось сохранить checkpoint.");
    } finally {
      setSavingCheckpointCode("");
    }
  };

  const checkpointCards = checkpointsMeta.map((meta, index) => {
    const submission = team?.checkpoints?.find((item) => item.code === meta.code);
    const previous = index === 0 ? null : team?.checkpoints?.find((item) => item.code === checkpointsMeta[index - 1]?.code);
    const isLocked = !team || (previous && previous.status !== "submitted");
    const draft = checkpointDrafts[meta.code] || { submissionUrl: "", notes: "" };

    return {
      ...meta,
      status: submission?.status || "pending",
      submissionUrl: draft.submissionUrl,
      notes: draft.notes,
      isLocked,
    };
  });

  const handleJudgeDraftChange = (teamId, field, value) => {
    const criterion = (judgeDashboard?.criteria || judgeCriteriaFallback).find((item) => item.key === field);
    let nextValue = value;

    if (field !== "comments") {
      const digitsOnly = String(value).replace(/[^\d]/g, "");

      if (!digitsOnly) {
        nextValue = "";
      } else {
        const normalized = String(Number(digitsOnly));
        const limited = criterion ? Math.min(Number(normalized), criterion.max) : Number(normalized);
        nextValue = String(limited);
      }
    }

    setJudgeDrafts((current) => ({
      ...current,
      [teamId]: {
        ...current[teamId],
        [field]: field === "comments" ? value : nextValue,
      },
    }));
    setJudgeStatus("");
  };

  const submitJudgeScore = async (teamId) => {
    setSavingJudgeTeamId(String(teamId));
    setJudgeStatus("");

    try {
      const draft = judgeDrafts[teamId] || {};
      const payload = {
        problemUnderstanding: Number(draft.problemUnderstanding || 0),
        solutionQuality: Number(draft.solutionQuality || 0),
        innovation: Number(draft.innovation || 0),
        feasibility: Number(draft.feasibility || 0),
        prototypeMvp: Number(draft.prototypeMvp || 0),
        pitchPresentation: Number(draft.pitchPresentation || 0),
        comments: draft.comments || "",
      };
      const data = await apiRequest(`/judge/scores/${teamId}`, "PUT", payload, token);
      const refreshed = await apiRequest("/judge/dashboard", "GET", null, token);
      setJudgeDashboard(refreshed);
      setJudgeDrafts(
        Object.fromEntries(
          (refreshed.teams || []).map((teamItem) => [teamItem.id, createJudgeDraft(teamItem.score)])
        )
      );
      setJudgeStatus(data.message);
    } catch (error) {
      setJudgeStatus(error.message || "Не удалось сохранить оценку.");
    } finally {
      setSavingJudgeTeamId("");
    }
  };

  return (
    <>
      <Navbar
        brand={isJudge ? "Judge Panel" : "Almaty Digital"}
        links={isJudge ? [{ href: "#portal", label: "Оценивание" }] : navLinks}
        languages={languages}
        currentLanguage="ru"
        onLanguageChange={() => {}}
        isHidden={isNavHidden}
      />

      <main>
        <section className="hero hero--light" id="hero">
          <div className="hero__glow" aria-hidden="true" />
          <div className="container hero-v2">
            <div className="hero-v2__content">
              <div className="hero-v2__topline">
                <span className="hero-pill">Технологический хакатон</span>
                <div className="hero-v2__meta-inline">
                  <span>6-7 июня 2026</span>
                  <span>ALT University</span>
                </div>
              </div>
              <h1>
                {isJudge ? (
                  <>
                    Judge <span>Dashboard 2026</span>
                  </>
                ) : (
                  <>
                    Almaty Digital <span>Hackathon 2026</span>
                  </>
                )}
              </h1>
              <p>
                {isJudge
                  ? "После входа жюри видит только назначенный кейс, команды по порядку и форму оценки по критериям."
                  : "Молодежный технологический хакатон на 24 часа. До входа в аккаунт участники видят только информацию о событии, а после логина получают доступ к кейсам, регистрации команды и checkpoint'ам."}
              </p>

              {!isJudge ? <div className="hero-stats">
                <article className="hero-stat-card">
                  <strong>300+</strong>
                  <span>участников</span>
                </article>
                <article className="hero-stat-card">
                  <strong>24 часа</strong>
                  <span>длительность</span>
                </article>
                <article className="hero-stat-card">
                  <strong>2 250 000 тг</strong>
                  <span>призовой фонд</span>
                </article>
              </div> : null}

              {!isJudge ? <div className="hero-support">
                <span>При поддержке:</span>
                <div className="hero-support__chips">
                  <span>ALT University</span>
                  <span>Alatau City Bank</span>
                  <span>Innovation Partners</span>
                </div>
              </div> : null}

              {!isJudge ? <div className="hero-ribbon">
                <div>
                  <strong>3</strong>
                  <span>бизнес-кейса</span>
                </div>
                <div>
                  <strong>9</strong>
                  <span>победителей</span>
                </div>
                <div>
                  <strong>3</strong>
                  <span>обязательных checkpoint&apos;а</span>
                </div>
                <div>
                  <strong>24ч</strong>
                  <span>интенсива</span>
                </div>
              </div> : null}
            </div>

            <div className="auth-card">
              {!user ? (
                <>
                  <div className="auth-card__tabs">
                    <button
                      type="button"
                      className={authMode === "register" ? "is-active" : ""}
                      onClick={() => setAuthMode("register")}
                    >
                      Регистрация
                    </button>
                    <button
                      type="button"
                      className={authMode === "login" ? "is-active" : ""}
                      onClick={() => setAuthMode("login")}
                    >
                      Логин
                    </button>
                  </div>

                  <h2>{authMode === "register" ? "Создать аккаунт" : "Войти в аккаунт"}</h2>
                  <p>
                    После регистрации или входа у команды откроется кабинет с выбором
                    кейса, регистрацией состава и checkpoint&apos;ами.
                  </p>

                  <form className="auth-form" onSubmit={submitAuth}>
                    {authMode === "register" ? (
                      <>
                        <label className="field">
                          <span>ФИО</span>
                          <input
                            type="text"
                            name="fullName"
                            value={authForm.fullName}
                            onChange={handleAuthChange}
                            placeholder="Аружан Сапарова"
                          />
                          {authErrors.fullName ? <small className="field-error">{authErrors.fullName}</small> : null}
                        </label>

                        <label className="field">
                          <span>Номер телефона</span>
                          <input
                            type="tel"
                            name="phoneNumber"
                            value={authForm.phoneNumber}
                            onChange={handleAuthChange}
                            placeholder="+7 700 123 45 67"
                          />
                          {authErrors.phoneNumber ? <small className="field-error">{authErrors.phoneNumber}</small> : null}
                        </label>
                      </>
                    ) : null}

                    <label className="field">
                      <span>Email</span>
                      <input
                        type="email"
                        name="email"
                        value={authForm.email}
                        onChange={handleAuthChange}
                        placeholder="team@hackathon.kz"
                      />
                      {authErrors.email ? <small className="field-error">{authErrors.email}</small> : null}
                    </label>

                    <label className="field">
                      <span>Пароль</span>
                      <input
                        type="password"
                        name="password"
                        value={authForm.password}
                        onChange={handleAuthChange}
                        placeholder="Минимум 8 символов"
                      />
                      {authErrors.password ? <small className="field-error">{authErrors.password}</small> : null}
                    </label>

                    {authStatus ? <div className="form-status form-status--error">{authStatus}</div> : null}

                    <button type="submit" className="button button--primary" disabled={isAuthLoading}>
                      {isAuthLoading
                        ? "Подождите..."
                        : authMode === "register"
                          ? "Зарегистрироваться"
                          : "Войти"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="portal-summary">
                  <span className="hero-pill">Portal открыт</span>
                  <h2>Привет, {user.fullName}</h2>
                  <p>
                    {isJudge
                      ? "Тебе доступен только назначенный кейс и последовательная оценка команд по критериям."
                      : "Теперь тебе доступен профиль команды, 3 бизнес-кейса и все обязательные checkpoint'ы."}
                  </p>
                  {!isJudge ? <div className="portal-summary__meta">
                    <div>
                      <strong>Команда</strong>
                      <span>{team ? team.teamName : "Еще не зарегистрирована"}</span>
                    </div>
                    <div>
                      <strong>Checkpoint&apos;ы</strong>
                      <span>
                        {team?.checkpoints?.filter((item) => item.status === "submitted").length || 0}/3 завершено
                      </span>
                    </div>
                  </div> : null}
                  <div className="portal-summary__actions">
                    <a href="#portal" className="button button--primary">
                      {isJudge ? "Открыть оценивание" : "Открыть кабинет"}
                    </a>
                    <button type="button" className="button button--ghost" onClick={logout}>
                      Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {!isJudge ? <section className="sponsor-teaser" id="sponsors">
          <div className="container sponsor-teaser__wrap">
            <div className="sponsor-teaser__intro">
              <span className="section-heading__eyebrow">Партнеры</span>
              <h2>Партнеры, которых видно сразу</h2>
                <p>Этот блок расположен высоко на странице, чтобы sponsors и supporters были заметны с первого экрана.</p>
            </div>
            <div className="sponsor-teaser__grid sponsor-teaser__grid--animated">
              {sponsors.map((sponsor, index) => (
                <article key={sponsor.name} className="sponsor-teaser__card" style={{ animationDelay: `${index * 0.45}s` }}>
                  <div className="sponsor-teaser__logo">
                    <img className={sponsor.className} src={sponsor.logo} alt={sponsor.alt} />
                  </div>
                  <strong>{sponsor.name}</strong>
                </article>
              ))}
            </div>
          </div>
        </section> : null}

        {!isJudge ? <section className="section" id="about">
          <div className="container">
            <SectionHeading
              eyebrow="О хакатоне"
              title="Публично видна вся важная информация о событии"
              description="До логина пользователь видит формат хакатона, площадку, регламент, длительность 24 часа и призовой фонд. После входа открывается полноценный кабинет команды."
            />
            <div className="content-grid">
              <article className="glass-card">
                <h3>1 из 3 бизнес-кейсов</h3>
                <p>Команда не решает все кейсы сразу. После входа выбирается один кейс, с которым команда работает весь хакатон.</p>
              </article>
              <article className="glass-card">
                <h3>24 часа</h3>
                <p>Формат рассчитан на интенсивную работу команды в течение 24 часов с обязательной финальной подачей.</p>
              </article>
              <article className="glass-card">
                <h3>Portal после логина</h3>
                <p>Кейсы, регистрация команды, checkpoint&apos;ы и статус сдачи становятся доступны только после регистрации и входа.</p>
              </article>
            </div>
          </div>
        </section> : null}

        {!isJudge ? <section className="section section--muted" id="venue">
          <div className="container venue">
            <div>
              <SectionHeading
                eyebrow="Локация"
                title="ALT University"
                description="Хакатон пройдет по адресу ул. Шевченко, 97, Алматы. На площадке будут рабочие зоны, сцена для питчинга и зона нетворкинга."
              />
              <div className="venue-card">
                <h3>ALT University</h3>
                <p>ул. Шевченко, 97, Алматы, Казахстан</p>
                <p>Дата проведения: 6-7 июня 2026. Формат: 24 часа непрерывной командной работы.</p>
              </div>
            </div>
            <div className="map-card">
              <iframe
                className="map-card__frame"
                title="ALT University map"
                src="https://www.google.com/maps?q=ALT%20University%20Shevchenko%2097%20Almaty&z=16&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                className="map-card__link"
                href="https://www.google.com/maps/search/?api=1&query=ALT+University+Shevchenko+97+Almaty"
                target="_blank"
                rel="noreferrer"
              >
                Открыть карту
              </a>
            </div>
          </div>
        </section> : null}

        {!isJudge ? <section className="section" id="details">
          <div className="container">
            <SectionHeading
              eyebrow="Детали"
              title="Структура хакатона и бизнес-кейсов"
              description="Команда выбирает один кейс, работает над решением 24 часа и после входа получает доступ к кабинету команды."
            />

            <div className="prize-spotlight">
              <div className="prize-spotlight__main">
                <span className="prize-spotlight__badge">Призовой фонд</span>
                <h3>2 250 000 тг</h3>
                <p>3 бизнес-кейса. На каждый кейс по 3 победителя: 250 000 / 150 000 / 100 000 тг.</p>
                <div className="prize-spotlight__places">
                  <span>1 место — 350 000</span>
                  <span>2 место — 250 000</span>
                  <span>3 место — 150 000</span>
                </div>
              </div>
              <div className="prize-spotlight__split">
                <div className="prize-mini-card">
                  <span>24h</span>
                  <strong>Хакатон</strong>
                </div>
                <div className="prize-mini-card">
                  <span>3</span>
                  <strong>Checkpoint&apos;а</strong>
                </div>
                <div className="prize-mini-card">
                  <span>9</span>
                  <strong>Победителей</strong>
                </div>
              </div>
            </div>

            <div className="pill-grid">
              {publicCases.map((item) => (
                <div key={item} className="pill-card">
                  {item}
                </div>
              ))}
            </div>

            <div className="judging-showcase">
              <div className="judging-showcase__intro">
                <span>Критерии и спецноминации</span>
                <p>Ниже собраны основные критерии оценки проекта и отдельные специальные номинации.</p>
              </div>

              <div className="judging-layout">
                <section className="judging-panel">
                  <div className="judging-panel__header">
                    <h3>Критерии оценки</h3>
                    <p>Основная оценка проекта строится по 100-балльной системе.</p>
                  </div>
                  <div className="judging-grid">
                    {[
                      ["Понимание проблемы", "15"],
                      ["Качество решения", "20"],
                      ["Инновационность", "15"],
                      ["Реализуемость", "20"],
                      ["Прототип / MVP", "15"],
                      ["Питч / Презентация", "15"],
                    ].map(([title, score]) => (
                      <article key={title} className="judging-card">
                        <strong>{score}</strong>
                        <span>{title}</span>
                      </article>
                    ))}
                  </div>
                  <div className="judging-total">Общий балл: 100</div>
                </section>

                <section className="judging-panel">
                  <div className="judging-panel__header">
                    <h3>Спецноминации</h3>
                    <p>Эти награды оцениваются отдельно от основной сотки.</p>
                  </div>
                  <div className="nominations-grid">
                    <article className="nomination-card">
                      <h4>Best AI Use</h4>
                      <p>За уместное использование AI, которое реально усиливает ценность решения.</p>
                    </article>
                    <article className="nomination-card">
                      <h4>Best Pitch</h4>
                      <p>За самое сильное и убедительное выступление, хорошую структуру и подачу.</p>
                    </article>
                    <article className="nomination-card">
                      <h4>Best Practical Solution</h4>
                      <p>За наиболее практичное, полезное и реалистичное решение.</p>
                    </article>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section> : null}

        {!isJudge ? <section className="section section--accent">
          <div className="container">
            <SectionHeading
              eyebrow="Release"
              title="Обратный отсчет до открытия кейсов"
              description="После входа в аккаунт команда увидит кейсы и сможет зарегистрировать свой состав в кабинете."
              align="center"
            />
            <Countdown targetDate={countdownTarget} texts={countdownTexts} />
          </div>
        </section> : null}

        <section className="section portal-section" id="portal">
          <div className="container">
            <SectionHeading
              eyebrow={isJudge ? "Judge Panel" : "Team Portal"}
              title={
                isJudge
                  ? "Оценивание команд по назначенному кейсу"
                  : user
                    ? "Кабинет команды"
                    : "Кабинет откроется после регистрации и логина"
              }
              description={
                isJudge
                  ? "Жюри видит только свой кейс, список команд по порядку и форму оценки по критериям."
                  : user
                  ? "Сначала зарегистрируйте состав команды и выберите кейс. После этого ниже откроется отдельный блок для checkpoint'ов."
                  : "Сейчас здесь только превью возможностей. После регистрации и входа откроются кейсы, регистрация команды и checkpoint'ы."
              }
            />

            {!user ? (
              <div className="locked-panel">
                <h3>Сначала нужен аккаунт</h3>
                <p>После регистрации и логина здесь откроются:</p>
                <ul className="locked-list">
                  <li>регистрация команды в профиле</li>
                  <li>выбор одного из трех бизнес-кейсов</li>
                  <li>отдельный блок checkpoint&apos;ов после входа</li>
                  <li>сдача презентации, репозитория и финальных материалов</li>
                </ul>
              </div>
            ) : isJudge ? (
              <div className="judge-board">
                <section className="portal-panel judge-board__intro">
                  <div className="portal-panel__header">
                    <h3>{judgeDashboard?.assignedCase?.title || "Назначенный кейс"}</h3>
                    <p>
                      {judgeDashboard?.assignedCase?.summary ||
                        "У этого аккаунта уже закреплен один кейс, и жюри не видит команды из других кейсов."}
                    </p>
                  </div>
                </section>

                <div className="judge-teams">
                  {(judgeDashboard?.teams || []).map((teamItem, index) => (
                    <article key={teamItem.id} className="portal-panel judge-team-card">
                      <div className="judge-team-card__header">
                        <div>
                          <span className="hero-pill">Команда {index + 1}</span>
                          <h3>{teamItem.teamName}</h3>
                          <p>Капитан: {teamItem.captainName}</p>
                        </div>
                        <div className="judge-team-card__score">
                          <strong>{teamItem.score?.totalScore ?? 0}</strong>
                          <span>/ 100</span>
                        </div>
                      </div>

                      <div className="judge-team-card__members">
                        {teamItem.members.map((member, memberIndex) => (
                          <div key={`${teamItem.id}-${memberIndex}`} className="judge-member-chip">
                            <strong>{member.fullName}</strong>
                            <small>{member.gradeOrCourse}</small>
                          </div>
                        ))}
                      </div>

                      <div className="judge-criteria-grid">
                        {(judgeDashboard?.criteria || judgeCriteriaFallback).map((criterion) => (
                          <label key={`${teamItem.id}-${criterion.key}`} className="field">
                            <span>
                              {criterion.label} / {criterion.max}
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              min="0"
                              max={criterion.max}
                              value={judgeDrafts[teamItem.id]?.[criterion.key] ?? ""}
                              onChange={(event) =>
                                handleJudgeDraftChange(teamItem.id, criterion.key, event.target.value)
                              }
                            />
                          </label>
                        ))}
                      </div>

                      <label className="field">
                        <span>Комментарий жюри</span>
                        <textarea
                          rows="4"
                          value={judgeDrafts[teamItem.id]?.comments ?? ""}
                          onChange={(event) => handleJudgeDraftChange(teamItem.id, "comments", event.target.value)}
                          placeholder="Короткий комментарий по сильным и слабым сторонам команды"
                        />
                      </label>

                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() => submitJudgeScore(teamItem.id)}
                        disabled={savingJudgeTeamId === String(teamItem.id)}
                      >
                        {savingJudgeTeamId === String(teamItem.id) ? "Сохранение..." : "Сохранить оценку"}
                      </button>
                    </article>
                  ))}
                </div>

                {judgeStatus ? <div className="form-status form-status--success">{judgeStatus}</div> : null}
              </div>
            ) : (
              <>
                <div className="portal-grid">
                  <section className="portal-panel">
                    <div className="portal-panel__header">
                      <h3>Профиль команды</h3>
                      <p>Капитан заполняет команду целиком. После сохранения состав и выбранный кейс закрепляются в профиле.</p>
                    </div>

                    <form className="team-form" onSubmit={saveTeam}>
                      <div className="form-grid">
                        <label className="field">
                          <span>Название команды</span>
                          <input
                            type="text"
                            name="teamName"
                            value={teamForm.teamName}
                            onChange={handleTeamChange}
                            placeholder="Almaty Digital"
                          />
                          {teamErrors.teamName ? <small className="field-error">{teamErrors.teamName}</small> : null}
                        </label>

                        <label className="field">
                          <span>Количество участников</span>
                          <select value={teamSize} name="teamSize" onChange={handleTeamChange}>
                            {[3, 4, 5].map((count) => (
                              <option key={count} value={count}>
                                {count}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field field--full">
                          <span>Выбранный бизнес-кейс</span>
                          <select name="caseId" value={teamForm.caseId} onChange={handleTeamChange}>
                            <option value="">Выберите кейс</option>
                            {cases.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.title}
                              </option>
                            ))}
                          </select>
                          {teamErrors.caseId ? <small className="field-error">{teamErrors.caseId}</small> : null}
                        </label>
                      </div>

                      <div className="members-section">
                        <div className="members-section__header">
                          <h3>Состав команды</h3>
                          <p>Минимум 3 и максимум 5 человек. Для каждого участника нужен свой Класс/Курс.</p>
                        </div>

                        <div className="members-grid">
                          {teamForm.members.map((member, index) => (
                            <article key={index} className="member-card">
                              <h4>Участник {index + 1}</h4>
                              <label className="field">
                                <span>ФИО</span>
                                <input
                                  type="text"
                                  value={member.fullName}
                                  onChange={(event) => handleMemberChange(index, "fullName", event.target.value)}
                                  placeholder="Введите ФИО"
                                />
                                {teamErrors[`members.${index}.fullName`] ? (
                                  <small className="field-error">{teamErrors[`members.${index}.fullName`]}</small>
                                ) : null}
                              </label>
                              <label className="field">
                                <span>Телефон</span>
                                <input
                                  type="tel"
                                  value={member.phoneNumber}
                                  onChange={(event) => handleMemberChange(index, "phoneNumber", event.target.value)}
                                  placeholder="+7 700 123 45 67"
                                />
                                {teamErrors[`members.${index}.phoneNumber`] ? (
                                  <small className="field-error">{teamErrors[`members.${index}.phoneNumber`]}</small>
                                ) : null}
                              </label>
                              <label className="field">
                                <span>Класс/Курс</span>
                                <select
                                  value={member.gradeOrCourse}
                                  onChange={(event) => handleMemberChange(index, "gradeOrCourse", event.target.value)}
                                >
                                  <option value="">Выберите</option>
                                  {gradeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                {teamErrors[`members.${index}.gradeOrCourse`] ? (
                                  <small className="field-error">{teamErrors[`members.${index}.gradeOrCourse`]}</small>
                                ) : null}
                              </label>
                            </article>
                          ))}
                        </div>
                      </div>

                      {teamStatus ? <div className="form-status form-status--success">{teamStatus}</div> : null}
                      {teamErrors.members ? <div className="form-status form-status--error">{teamErrors.members}</div> : null}

                      <button type="submit" className="button button--primary" disabled={isTeamSaving}>
                        {isTeamSaving ? "Сохранение..." : "Сохранить команду"}
                      </button>
                    </form>
                  </section>

                  <section className="portal-panel">
                    <div className="portal-panel__header">
                      <h3>Выбор кейса</h3>
                      <p>
                        После сохранения команды выберите один бизнес-кейс. Блок с checkpoint&apos;ами находится ниже и доступен только после входа.
                      </p>
                    </div>

                    <div className="case-grid">
                      {cases.map((item) => (
                        <article key={item.id} className={`case-card ${String(teamForm.caseId) === String(item.id) ? "case-card--active" : ""}`}>
                          <h4>{item.title}</h4>
                          <p>{item.summary}</p>
                        </article>
                      ))}
                    </div>

                  </section>
                </div>

                <section className="portal-panel portal-panel--checkpoints">
                  <div className="portal-panel__header">
                    <h3>Checkpoint&apos;ы команды</h3>
                    <p>
                      Этот блок доступен только после регистрации и входа. Все три checkpoint&apos;а обязательны, а следующий открывается только после предыдущего.
                    </p>
                  </div>

                  <div className="checkpoint-grid">
                    {checkpointCards.map((checkpoint) => (
                      <article key={checkpoint.code} className="checkpoint-card">
                        <div className="checkpoint-card__header">
                          <div>
                            <span>{checkpointLabels[checkpoint.code] || checkpoint.title}</span>
                            <h4>{checkpoint.title}</h4>
                          </div>
                          <b className={checkpoint.status === "submitted" ? "status-badge status-badge--success" : "status-badge"}>
                            {checkpoint.status === "submitted" ? "Сдан" : checkpoint.isLocked ? "Закрыт" : "Ожидает"}
                          </b>
                        </div>
                        <p>{checkpoint.description}</p>
                        <label className="field">
                          <span>Ссылка на материал</span>
                          <input
                            type="url"
                            value={checkpoint.submissionUrl}
                            disabled={checkpoint.isLocked}
                            onChange={(event) =>
                              handleCheckpointDraft(checkpoint.code, "submissionUrl", event.target.value)
                            }
                            placeholder="Google Drive / GitHub / Figma / презентация"
                          />
                        </label>
                        <label className="field">
                          <span>Комментарий</span>
                          <input
                            type="text"
                            value={checkpoint.notes}
                            disabled={checkpoint.isLocked}
                            onChange={(event) =>
                              handleCheckpointDraft(checkpoint.code, "notes", event.target.value)
                            }
                            placeholder="Короткое описание отправки"
                          />
                        </label>
                        <button
                          type="button"
                          className="button button--secondary"
                          disabled={checkpoint.isLocked || savingCheckpointCode === checkpoint.code}
                          onClick={() => submitCheckpoint(checkpoint.code)}
                        >
                          {savingCheckpointCode === checkpoint.code ? "Сохранение..." : "Отправить checkpoint"}
                        </button>
                      </article>
                    ))}
                  </div>

                  {checkpointStatus ? <div className="form-status form-status--success">{checkpointStatus}</div> : null}
                </section>

                {user.isAdmin ? (
                  <section className="admin-panel">
                  <div className="admin-panel__header">
                    <div>
                      <span className="section-heading__eyebrow">Admin dashboard</span>
                      <h3>Все команды, кейсы, участники и checkpoint&apos;ы</h3>
                      <p>
                        Здесь видно, какая команда выбрала какой кейс, кто состоит в команде и какие обязательные checkpoint&apos;ы еще не сданы.
                      </p>
                    </div>
                    <div className="admin-panel__stats">
                      <div>
                        <strong>{adminOverview?.teams?.length || 0}</strong>
                        <span>команд</span>
                      </div>
                      <div>
                        <strong>{adminOverview?.users?.length || 0}</strong>
                        <span>аккаунтов</span>
                      </div>
                    </div>
                  </div>

                  {adminStatus ? <div className="form-status form-status--error">{adminStatus}</div> : null}

                  <div className="admin-grid">
                    {(adminOverview?.teams || []).map((adminTeam) => {
                      const missingCheckpoints = adminTeam.checkpoints.filter((checkpoint) => !checkpoint.submitted);

                      return (
                        <article key={adminTeam.id} className="admin-team-card">
                          <div className="admin-team-card__top">
                            <div>
                              <h4>{adminTeam.teamName}</h4>
                              <p>
                                Капитан: {adminTeam.ownerName} • {adminTeam.ownerEmail}
                              </p>
                            </div>
                            <b className="admin-case-badge">{adminTeam.caseTitle}</b>
                          </div>

                          <div className="admin-team-card__section">
                            <span>Участники</span>
                            <div className="admin-members-list">
                              {adminTeam.members.map((member, index) => (
                                <div key={`${adminTeam.id}-${index}`} className="admin-member-row">
                                  <strong>{member.fullName}</strong>
                                  <small className="admin-member-row__phone">{member.phoneNumber}</small>
                                  <small>{member.gradeOrCourse}</small>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="admin-team-card__section">
                            <span>Checkpoint&apos;ы</span>
                            <div className="admin-checkpoint-list">
                              {adminTeam.checkpoints.map((checkpoint) => (
                                <div
                                  key={`${adminTeam.id}-${checkpoint.code}`}
                                  className={`admin-checkpoint-row ${checkpoint.submitted ? "is-submitted" : "is-missing"}`}
                                >
                                  <div>
                                    <strong>{checkpoint.title}</strong>
                                    <small>{checkpoint.submitted ? "Сдан" : "Не сдан"}</small>
                                  </div>
                                  {checkpoint.submissionUrl ? (
                                    <a href={checkpoint.submissionUrl} target="_blank" rel="noreferrer">
                                      Открыть
                                    </a>
                                  ) : (
                                    <span className="admin-checkpoint-row__empty">Нет ссылки</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="admin-team-card__footer">
                            {missingCheckpoints.length > 0 ? (
                              <span>
                                Не загружено: {missingCheckpoints.map((checkpoint) => checkpoint.title).join(", ")}
                              </span>
                            ) : (
                              <span>Все 3 checkpoint&apos;а загружены.</span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

async function apiRequest(path, method = "GET", body, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.errors = data.errors || {};
    throw error;
  }

  return data;
}

export default App;
