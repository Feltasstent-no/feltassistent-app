import { useEffect, useRef, useState } from 'react';

interface NumericTextInputProps {
  value: number | null | undefined;
  onCommit: (value: number | null) => void;
  allowNegative?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
}

function toDisplay(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function NumericTextInput({
  value,
  onCommit,
  allowNegative = false,
  placeholder,
  className = '',
  ariaLabel,
  onClick,
}: NumericTextInputProps) {
  const [local, setLocal] = useState<string>(toDisplay(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setLocal(toDisplay(value));
    }
  }, [value]);

  const sanitize = (raw: string): string => {
    if (allowNegative) {
      const cleaned = raw.replace(/[^0-9-]/g, '');
      const negative = cleaned.startsWith('-');
      return (negative ? '-' : '') + cleaned.replace(/-/g, '');
    }
    return raw.replace(/[^0-9]/g, '');
  };

  const commit = () => {
    focusedRef.current = false;
    const trimmed = local.trim();
    const parsed = trimmed === '' || trimmed === '-' ? null : parseInt(trimmed, 10);
    const next = parsed !== null && Number.isNaN(parsed) ? null : parsed;

    if (next !== (value ?? null)) {
      onCommit(next);
    } else {
      setLocal(toDisplay(value));
    }
  };

  return (
    <input
      type="text"
      inputMode={allowNegative ? 'text' : 'numeric'}
      pattern={allowNegative ? '-?[0-9]*' : '[0-9]*'}
      value={local}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onClick={onClick}
      onFocus={(e) => {
        focusedRef.current = true;
        e.target.select();
      }}
      onChange={(e) => setLocal(sanitize(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
}
