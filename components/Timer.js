import { useState, useEffect } from 'react';

export default function Timer() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const format = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className='vr-timer'>
      <div className='vr-timer__time'>{format(seconds)}</div>
      <button
        className='vr-card'
        onClick={() => setRunning((r) => !r)}
      >
        {running ? 'Pause' : 'Start'}
      </button>
      <button
        className='vr-card'
        onClick={() => {
          setSeconds(0);
          setRunning(false);
        }}
      >
        Reset
      </button>
    </div>
  );
}
