"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  expiresAt: string;
  onExpire: () => void;
};

function parseExpires(iso: string) {
  return new Date(iso).getTime();
}

function formatTime(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CountdownTimer({ expiresAt, onExpire }: Props) {
  const [left, setLeft] = useState(0);
  const didExpire = useRef(false);

  useEffect(() => {
    didExpire.current = false;
    const end = parseExpires(expiresAt);
    const tick = () => {
      const now = Date.now();
      const rem = end - now;
      setLeft(rem);
      if (rem <= 0 && !didExpire.current) {
        didExpire.current = true;
        onExpire();
      }
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [expiresAt, onExpire]);

  const critical = left > 0 && left < 5 * 60 * 1000;

  return (
    <p
      className={`text-3xl font-extrabold tabular-nums ${
        critical ? "text-red-600" : "text-slate-900"
      }`}
    >
      {formatTime(left)}
    </p>
  );
}
