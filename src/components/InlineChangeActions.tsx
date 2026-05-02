import { Check, X } from 'lucide-react';

interface Props {
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function InlineChangeActions({ saving = false, onSave, onCancel }: Props) {
  return (
    <div className="inline-flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="btn-primary rounded-md px-2 py-1 text-xs disabled:opacity-50"
        aria-label="שמור שינוי"
      >
        <Check size={13} />
        {saving ? 'שומר...' : 'שמור'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="btn-ghost rounded-md px-2 py-1 text-xs disabled:opacity-50"
        aria-label="בטל שינוי"
      >
        <X size={13} />
        בטל
      </button>
    </div>
  );
}
