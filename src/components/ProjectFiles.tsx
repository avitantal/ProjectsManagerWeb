import { useEffect, useState } from 'react';
import { FileText, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';
import { supabase, type ProjectFile, type Scope } from '../lib/supabase';

interface Props {
  scope: Scope;
  projectId: number;
  onTasksChange: () => void;
}

const ACCEPTED = '.txt,.md,.markdown,.csv,.json,.log,text/plain,text/markdown';
const MAX_BYTES = 2 * 1024 * 1024;

export function ProjectFiles({ scope, projectId, onTasksChange }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractingId, setExtractingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setMessage(null);
    if (file.size > MAX_BYTES) {
      setError(`הקובץ גדול מדי (מקסימום ${MAX_BYTES / 1024 / 1024}MB)`);
      return;
    }
    setUploading(true);
    try {
      const path = `${scope}/${projectId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, file, { contentType: file.type || 'text/plain' });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('project_files').insert({
        project_type: scope,
        project_id: projectId,
        file_name: file.name,
        storage_path: path,
        content_type: file.type || null,
        size_bytes: file.size,
      });
      if (insErr) throw insErr;
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  }

  async function extractTasks(file: ProjectFile) {
    setExtractingId(file.id);
    setError(null);
    setMessage(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('extract-tasks', {
        body: { project_type: scope, project_id: projectId, file_id: file.id },
      });
      if (fnErr) throw fnErr;
      const count = (data as { count?: number } | null)?.count ?? 0;
      setMessage(count > 0 ? `נוספו ${count} משימות מוצעות` : 'לא נמצאו משימות בקובץ');
      onTasksChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהסקה');
    } finally {
      setExtractingId(null);
    }
  }

  async function removeFile(file: ProjectFile) {
    if (!confirm(`למחוק את ${file.file_name}?`)) return;
    if (file.storage_path) {
      await supabase.storage.from('project-files').remove([file.storage_path]);
    }
    await supabase.from('project_files').delete().eq('id', file.id);
    await refresh();
  }

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted">קבצים</div>
        <label className="btn-ghost text-xs cursor-pointer">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          העלאה
          <input type="file" className="hidden" accept={ACCEPTED} onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <div className="text-xs text-red-400">{error}</div>}
      {message && <div className="text-xs text-green-400">{message}</div>}

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
              <button
                type="button"
                onClick={() => void extractTasks(f)}
                disabled={extractingId !== null}
                className="rounded-md bg-accent/20 px-2 py-0.5 text-accent hover:bg-accent/30 disabled:opacity-50 inline-flex items-center gap-1"
                title="הסק משימות מהקובץ"
              >
                {extractingId === f.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                הסק משימות
              </button>
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
