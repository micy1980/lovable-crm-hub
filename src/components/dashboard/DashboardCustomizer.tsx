import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, GripVertical } from 'lucide-react';
import { DEFAULT_WIDGETS, useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetItemProps {
  widget: {
    id: string;
    title: string;
    is_visible: boolean;
    width: string;
  };
  onToggle: (widgetId: string, isVisible: boolean) => void;
  onWidthChange: (widgetId: string, width: string) => void;
}

const SortableWidgetItem = ({ widget, onToggle, onWidthChange }: SortableWidgetItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2 px-1 border-b last:border-0"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="flex-1">
        <Label htmlFor={`widget-${widget.id}`} className="text-sm font-medium cursor-pointer">
          {widget.title}
        </Label>
      </div>
      
      <Select
        value={widget.width}
        onValueChange={(value) => onWidthChange(widget.id, value)}
      >
        <SelectTrigger className="w-20 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="full">Teljes</SelectItem>
          <SelectItem value="half">Fél</SelectItem>
          <SelectItem value="third">Harmad</SelectItem>
        </SelectContent>
      </Select>
      
      <Switch
        id={`widget-${widget.id}`}
        checked={widget.is_visible}
        onCheckedChange={(checked) => onToggle(widget.id, checked)}
      />
    </div>
  );
};

export const DashboardCustomizer = () => {
  const { widgets, updateWidget, reorderWidgets } = useDashboardWidgets();
  const [open, setOpen] = useState(false);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      const newOrder = arrayMove(widgets, oldIndex, newIndex);
      reorderWidgets(newOrder.map((w) => w.id));
    }
  };

  const handleToggle = (widgetId: string, isVisible: boolean) => {
    updateWidget({ widgetId, isVisible });
  };

  const handleWidthChange = (widgetId: string, width: string) => {
    updateWidget({ widgetId, width });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Testreszabás
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Widget beállítások</h4>
          <p className="text-xs text-muted-foreground">
            Kapcsold be/ki és rendezd át a widgeteket húzással
          </p>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="border rounded-md mt-3">
                {widgets.map((widget) => (
                  <SortableWidgetItem
                    key={widget.id}
                    widget={widget}
                    onToggle={handleToggle}
                    onWidthChange={handleWidthChange}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </PopoverContent>
    </Popover>
  );
};
