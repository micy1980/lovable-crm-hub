import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, GripVertical, User, Calendar, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { toast } from 'sonner';
import { TaskDialog } from './TaskDialog';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  deadline: string | null;
  project_id: string | null;
  responsible_user_id: string | null;
  partner_id: string | null;
  responsible_user?: { full_name: string | null; email: string } | null;
  project?: { name: string; code: string | null } | null;
  partner?: { name: string } | null;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'new', title: 'Új', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'Folyamatban', color: 'bg-yellow-500' },
  { id: 'review', title: 'Ellenőrzés', color: 'bg-purple-500' },
  { id: 'done', title: 'Kész', color: 'bg-green-500' },
];

interface SortableTaskCardProps {
  task: Task;
  onClick: () => void;
}

const SortableTaskCard = ({ task, onClick }: SortableTaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0" onClick={onClick}>
          <p className="font-medium text-sm truncate">{task.title}</p>
          
          {task.project && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{task.project.code || task.project.name}</span>
            </div>
          )}
          
          {task.responsible_user && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate">{task.responsible_user.full_name || task.responsible_user.email}</span>
            </div>
          )}
          
          {task.deadline && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.deadline), 'yyyy.MM.dd HH:mm', { locale: hu })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TaskCardOverlayProps {
  task: Task;
}

const TaskCardOverlay = ({ task }: TaskCardOverlayProps) => {
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg cursor-grabbing">
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-1 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{task.title}</p>
        </div>
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  column: KanbanColumn;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: string) => void;
}

const KanbanColumnComponent = ({ column, tasks, onTaskClick, onAddTask }: KanbanColumnProps) => {
  return (
    <div className="flex-shrink-0 w-72 bg-muted/30 rounded-lg flex flex-col h-full">
      <div className="p-3 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${column.color}`} />
            <h3 className="font-semibold text-sm">{column.title}</h3>
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddTask(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[100px]">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
};

interface KanbanBoardProps {
  projectId?: string;
}

export const KanbanBoard = ({ projectId }: KanbanBoardProps) => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['kanban-tasks', activeCompany?.id, projectId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          responsible_user:profiles!tasks_responsible_user_id_fkey(full_name, email),
          project:projects(name, code),
          partner:partners(name)
        `)
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!activeCompany?.id,
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      toast.success('Feladat státusz frissítve');
    },
    onError: () => {
      toast.error('Hiba történt a státusz frissítésekor');
    },
  });

  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    DEFAULT_COLUMNS.forEach(col => {
      grouped[col.id] = [];
    });
    
    tasks.forEach(task => {
      const status = task.status || 'new';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['new'].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    return tasks.find(t => t.id === activeId) || null;
  }, [activeId, tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Find which column the task was dropped into
    let targetColumn: string | null = null;
    
    // Check if dropped on another task
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      targetColumn = overTask.status || 'new';
    } else {
      // Check if dropped on a column
      const columnId = over.id as string;
      if (DEFAULT_COLUMNS.some(c => c.id === columnId)) {
        targetColumn = columnId;
      }
    }

    if (targetColumn && targetColumn !== (task.status || 'new')) {
      updateTaskStatus.mutate({ taskId, status: targetColumn });
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setNewTaskStatus(null);
    setTaskDialogOpen(true);
  };

  const handleAddTask = (status: string) => {
    setSelectedTask(null);
    setNewTaskStatus(status);
    setTaskDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
        {DEFAULT_COLUMNS.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask ? {
          ...selectedTask,
          status: selectedTask.status || 'new',
          deadline: selectedTask.deadline || '',
        } : null}
        projectId={projectId}
      />
    </DndContext>
  );
};
