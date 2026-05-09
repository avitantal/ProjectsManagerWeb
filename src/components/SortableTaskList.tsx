import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, Project, Scope } from '../lib/supabase';
import { TaskRow } from './TaskRow';

interface SortableItemProps {
  task: Task;
  project?: Project;
  projects: Project[];
  scope: Scope;
  onChange: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  isLastClosed?: boolean;
}

function SortableItem({ task, ...props }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      <TaskRow
        {...props}
        task={task}
        dragHandleListeners={listeners as Record<string, unknown>}
        dragHandleAttributes={attributes as Record<string, unknown>}
      />
    </div>
  );
}

interface Props {
  tasks: Task[];
  projects: Project[];
  scope: Scope;
  onChange: () => void;
  onReorder: (reordered: Task[]) => void;
  selectedTaskId: number | null;
  onSelect: (id: number | null) => void;
  lastClosedTaskId: number | null;
  projectsById: Map<number, Project>;
}

export function SortableTaskList({ tasks, projects, scope, onChange, onReorder, selectedTaskId, onSelect, lastClosedTaskId, projectsById }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex(t => t.id === active.id);
    const newIndex = tasks.findIndex(t => t.id === over.id);
    onReorder(arrayMove(tasks, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.length === 0 && (
            <div className="card p-6 text-center text-muted text-sm">אין משימות</div>
          )}
          {tasks.map(t => (
            <SortableItem
              key={t.id}
              task={t}
              project={t.project_id ? projectsById.get(t.project_id) : undefined}
              projects={projects}
              scope={scope}
              onChange={onChange}
              isSelected={selectedTaskId === t.id}
              onSelect={() => onSelect(selectedTaskId === t.id ? null : t.id)}
              isLastClosed={t.id === lastClosedTaskId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
