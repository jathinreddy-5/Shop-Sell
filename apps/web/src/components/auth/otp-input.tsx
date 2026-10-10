'use client';

import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digitsRef = useRef<string[]>(Array.from({ length: 6 }, (_, i) => value[i] || ''));
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  digitsRef.current = digits;

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const nextDigits = [...digitsRef.current];
    nextDigits[index] = char;
    digitsRef.current = nextDigits;
    const combined = nextDigits.join('').slice(0, 6);
    onChange(combined);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digitsRef.current[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const nextDigits = [...digitsRef.current];
        nextDigits[index - 1] = '';
        digitsRef.current = nextDigits;
        onChange(nextDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    onChange(pasted);
    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3" role="group" aria-label="6-Digit Verification Code">
      {Array.from({ length: 6 }).map((_, index) => {
        const digit = digits[index] || '';
        const isFilled = digit.length > 0;

        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{1}"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${index + 1} of 6`}
            data-testid={`otp-slot-${index}`}
            className={`h-12 w-11 sm:h-14 sm:w-14 rounded-2xl border text-center text-xl sm:text-2xl font-bold transition-all outline-none ${
              hasError
                ? 'border-red-400 bg-red-50/50 text-red-700 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                : isFilled
                ? 'border-[#059669] bg-white text-[#111827] shadow-sm ring-1 ring-[#059669]/30'
                : 'border-[#E2E8F0] bg-white text-[#111827] hover:border-slate-300 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          />
        );
      })}
    </div>
  );
}
