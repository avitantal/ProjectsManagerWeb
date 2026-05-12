import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { he } from 'date-fns/locale';
import { format, parse, isValid } from 'date-fns';
import { Calendar } from 'lucide-react';
import 'react-day-picker/style.css';

interface Props {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerInput({ value, onChange, placeholder = 'בחר תאריך', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const isValidDate = selected && isValid(selected);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleSelect(date: Date | undefined) {
    onChange(date ? format(date, 'yyyy-MM-dd') : '');
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input w-full flex items-center gap-2 text-right"
      >
        <Calendar size={14} className="text-muted shrink-0" />
        <span className={isValidDate ? 'text-text' : 'text-muted/50'}>
          {isValidDate ? format(selected!, 'dd/MM/yyyy') : placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 right-0 bg-bg border border-border rounded-xl shadow-xl p-2" dir="rtl">
          <DayPicker
            mode="single"
            selected={isValidDate ? selected : undefined}
            onSelect={handleSelect}
            locale={he}
            weekStartsOn={0}
            showOutsideDays
            classNames={{
              root: 'text-sm',
              months: 'flex flex-col',
              month: 'space-y-2',
              month_caption: 'flex justify-center items-center py-1 font-medium text-text',
              nav: 'flex items-center justify-between absolute w-full px-2 top-[18px]',
              button_previous: 'text-muted hover:text-text p-1 rounded',
              button_next: 'text-muted hover:text-text p-1 rounded',
              weeks: 'w-full border-collapse',
              weekdays: 'flex',
              weekday: 'text-muted text-[11px] w-9 h-7 flex items-center justify-center',
              week: 'flex mt-0.5',
              day: 'w-9 h-9 p-0 flex items-center justify-center',
              day_button: 'w-8 h-8 rounded-full text-sm hover:bg-surface transition-colors',
              selected: '[&>button]:bg-accent [&>button]:text-white [&>button]:hover:bg-accent',
              today: '[&>button]:font-bold [&>button]:text-accent',
              outside: '[&>button]:text-muted/30',
              disabled: '[&>button]:opacity-30 [&>button]:cursor-not-allowed',
            }}
          />
          {value && (
            <div className="border-t border-border pt-2 mt-1 flex justify-center">
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className="text-xs text-muted hover:text-red-400"
              >
                נקה תאריך
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
