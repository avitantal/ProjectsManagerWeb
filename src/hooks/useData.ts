import { useEffect, useState, useCallback } from 'react';
import { supabase, type Project, type Task, type Scope } from '../lib/supabase';

export function useFileCounts(scope: Scope) {
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  // Per-project searchable text built from attached file names + summaries.
  const [fileText, setFileText] = useState<Map<number, string>>(new Map());

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('project_files')
      .select('project_id, file_name, summary')
      .eq('project_type', scope);
    const countMap = new Map<number, number>();
    const textMap = new Map<number, string>();
    (data ?? []).forEach((r: { project_id: number; file_name: string | null; summary: string | null }) => {
      countMap.set(r.project_id, (countMap.get(r.project_id) ?? 0) + 1);
      const piece = [r.file_name, r.summary].filter(Boolean).join(' ');
      if (piece) {
        const prev = textMap.get(r.project_id);
        textMap.set(r.project_id, prev ? `${prev}\n${piece}` : piece);
      }
    });
    setCounts(countMap);
    setFileText(textMap);
  }, [scope]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  return { counts, fileText, refresh };
}

export function useProjects(scope: Scope) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(`${scope}_projects`)
      .select('*')
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false });
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  return { projects, loading, refresh };
}

export function useTasks(scope: Scope) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(`${scope}_tasks`)
      .select('*')
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false });
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  return { tasks, loading, refresh };
}
