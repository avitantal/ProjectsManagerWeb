import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase, type ProjectFile, type Scope } from '../lib/supabase';

interface Props {
  scope: Scope;
  projectId: number;
}

function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
    /\/document\/d\/([a-zA-Z0-9_-]{20,})/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/,
    /\/presentation\/d\/([a-zA-Z0-9_-]{20,})/,
    /[?&]id=([a-zA-Z0-9_-]{20,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function deriveFileName(url: string): string {
  if (url.includes('/document/d/')) return 'Google Doc';
  if (url.includes('/spreadsheets/d/')) return 'Google Sheet';
  if (url.includes('/presentation/d/')) return 'Google Slides';
  return 'Drive file';
}

export function ProjectFiles({ scope, projectId }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_type', scope)
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });
    setFiles((data ?? []) as ProjectFile[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, [scope, projectId]);

  async function addFile() {
    setError(null);
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('הדבק קישור Drive');
      return;
    }
    const fileId = extractDriveFileId(trimmedUrl);
    if (!fileId) {
      setError('לא הצלחתי לזהות מזהה קובץ Drive בקישור');
      return;
    }
    setAdding(true);
    try {
      const { error: insErr } = await supabase.from('project_files').insert({
        project_type: scope,
        project_id: projectId,
        file_name: name.trim() || deriveFileName(trimmedUrl),
        google_drive_url: trimmedUrl,
        google_drive_file_id: fileId,
      });
      if (insErr) throw insErr;
      setUrl('');
      setName('');
      setShowAdd(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספה');
    } finally {
      setAdding(false);
    }
  }

  async function removeFile(file: ProjectFile) {
    if (!confirm(`להסיר את ${file.file_name} מהפרויקט? (הקובץ ב-Drive לא יימחק)`)) return;
    await supabase.from('project_files').delete().eq('id', file.id);
    await refresh();
  }

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted">קבצים מ-Drive</div>
        <button
          type="button"
          onClick={() => { setShowAdd((v) => !v); setError(null); }}
          className="btn-ghost text-xs"
        >
          <Plus size={12} />
          הוסף קישור
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2 bg-bg/50 rounded-md p-2">
          <input
            type="url"
            className="input text-xs"
            placeholder="https://drive.google.com/... או https://docs.google.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            dir="ltr"
          />
          <input
            type="text"
            className="input text-xs"
            placeholder="שם להצגה (אופציונלי)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void addFile()}
              disabled={adding || !url.trim()}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {adding ? <Loader2 size={12} className="animate-spin" /> : 'שמור'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setUrl(''); setName(''); }}
              className="btn-ghost text-xs"
            >
              בטל
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}

      {loading ? (
        <div className="text-xs text-muted">טוען...</div>
      ) : files.length === 0 ? (
        <div className="text-xs text-muted">אין קבצים</div>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-xs bg-bg/50 rounded-md px-2 py-1.5 group/file">
              <FileText size={12} className="text-muted shrink-0" />
              <span className="flex-1 truncate" dir="ltr">{f.file_name}</span>
              {f.google_drive_url && (
                <a
                  href={f.google_drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-text"
                  aria-label="פתח ב-Drive"
                >
                  <ExternalLink size={12} />
                </a>
              )}
              <button
                type="button"
                onClick={() => void removeFile(f)}
                className="opacity-0 group-hover/file:opacity-100 text-muted hover:text-red-400 transition"
                aria-label="מחק"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
