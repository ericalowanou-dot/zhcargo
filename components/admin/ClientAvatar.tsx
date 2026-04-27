"use client";

type Props = {
  phone: string;
  name?: string | null;
  className?: string;
};

function initials(name?: string | null) {
  const clean = (name || "").trim();
  if (!clean) return "CL";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function colorFromPhone(phone: string) {
  let h = 0;
  for (let i = 0; i < phone.length; i++) h = (h * 31 + phone.charCodeAt(i)) | 0;
  const hue = Math.abs(h % 360);
  return `hsl(${hue} 65% 42%)`;
}

export function ClientAvatar({ phone, name, className = "" }: Props) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${className}`}
      style={{ backgroundColor: colorFromPhone(phone) }}
      title={name || phone}
    >
      {initials(name)}
    </span>
  );
}

