"use client";

import { Minus, Plus } from "lucide-react";

type QuantitySelectorProps = {
  quantity: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function QuantitySelector({ quantity, min, max, onChange }: QuantitySelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= min}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Diminuer"
      >
        <Minus size={18} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={quantity}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (Number.isNaN(v)) return;
          onChange(v);
        }}
        className="h-10 w-16 border-b border-slate-300 text-center text-base font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Augmenter"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
