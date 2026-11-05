export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${5 + i * 5}%`,
            background: ['#A78BFA', '#FBCFE8', '#BFDBFE', '#90d9b5'][i % 4],
            animationDelay: `${(i % 5) * 0.08}s`,
            rotate: `${i * 37}deg`,
          }}
        />
      ))}
    </div>
  );
}
