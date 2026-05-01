import { useEffect, useState, useCallback } from 'react';
import { supabase, type Project, type Task, type Scope } from '../lib/supabase';

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

  useEffect(() => { refresh(); }, [refresh]);

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

  useEffect(() => { refresh(); }, [refresh]);

  return { tasks, loading, refresh };
}
