"use client";

import { useEffect, useState } from "react";

const selectCls =
  "min-w-0 flex-1 appearance-none rounded-2xl border border-line bg-surface-2 bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat py-3 pl-3 pr-7 text-center text-[15px] font-semibold text-ink outline-none focus:border-pink/60 invalid:text-muted";
const caret = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a99cc8' stroke-width='2' fill='none'/%3E%3C/svg%3E\")" };

const range = (from: number, to: number) => Array.from({ length: Math.abs(to - from) + 1 }, (_, k) => (from <= to ? from + k : from - k));
const pad = (n: number) => String(n).padStart(2, "0");

function Select({ value, placeholder, options, onChange }: { value: string; placeholder: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select required className={selectCls} style={caret} value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Birth date (년/월/일) or time (시/분) as native dropdowns — a scroll wheel on phones, easier than a calendar.
 * Reports "YYYY-MM-DD" / "HH:MM" once every part is picked, "" before that.
 */
export function DateTimeSelects({ type, initial, onChange }: { type: "date" | "time"; initial: string; onChange: (v: string) => void }) {
  const parts = initial ? initial.split(/[-:]/).map((x) => String(Number(x))) : [];
  const [a, setA] = useState(parts[0] ?? "");
  const [b, setB] = useState(parts[1] ?? "");
  const [c, setC] = useState(parts[2] ?? "");

  const days = type === "date" && a && b ? new Date(Number(a), Number(b), 0).getDate() : 31;
  const day = c && Number(c) > days ? "" : c;
  const value =
    type === "date" ? (a && b && day ? `${a}-${pad(Number(b))}-${pad(Number(day))}` : "") : a && b ? `${pad(Number(a))}:${pad(Number(b))}` : "";

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  if (type === "date") {
    return (
      <div className="flex gap-2">
        <Select value={a} placeholder="년" onChange={setA} options={range(new Date().getFullYear(), 1940).map((y) => ({ v: String(y), label: `${y}년` }))} />
        <Select value={b} placeholder="월" onChange={setB} options={range(1, 12).map((m) => ({ v: String(m), label: `${m}월` }))} />
        <Select value={day} placeholder="일" onChange={setC} options={range(1, days).map((d) => ({ v: String(d), label: `${d}일` }))} />
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Select value={a} placeholder="시" onChange={setA} options={range(0, 23).map((h) => ({ v: String(h), label: `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}시` }))} />
      <Select value={b} placeholder="분" onChange={setB} options={range(0, 59).map((m) => ({ v: String(m), label: `${m}분` }))} />
    </div>
  );
}
