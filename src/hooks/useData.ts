import { useEffect, useState, useCallback } from 'react';
import { supabase, type Project, type Task, type Scope } from '../lib/supabase';

export function useFileCounts(scope: Scope) {
  const [counts, setCounts] = useState<Map<number, number>>(new Map());

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('project_files')
      .select('project_id')
      .eq('project_type', scope);
    const m = new Map<number, number>();
    (data ?? []).forEach((r: { project_id: number }) => {
      m.set(r.project_id, (m.get(r.project_id) ?? 0) + 1);
    });
    setCounts(m);
  }, [scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { counts, refresh };
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
