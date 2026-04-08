import { useEffect, useState } from "react";

const getTimeLeft = (targetDate) => {
  const difference = targetDate.getTime() - Date.now();

  if (difference <= 0) {
    return null;
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

function Countdown({ targetDate, texts }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className="countdown-complete">
        <p className="countdown-complete__badge">{texts.completeBadge}</p>
        <h3>{texts.completeTitle}</h3>
        <p>{texts.completeText}</p>
      </div>
    );
  }

  const items = [
    { label: texts.units.days, value: timeLeft.days },
    { label: texts.units.hours, value: timeLeft.hours },
    { label: texts.units.minutes, value: timeLeft.minutes },
    { label: texts.units.seconds, value: timeLeft.seconds },
  ];

  return (
    <div className="countdown-grid" aria-live="polite">
      {items.map((item) => (
        <div key={item.label} className="countdown-card">
          <span>{String(item.value).padStart(2, "0")}</span>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

export default Countdown;
