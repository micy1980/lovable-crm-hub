import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface MasterDataItemListProps {
  items: any[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onReorder: (items: any[]) => void;
}

function SortableRow({ item, canEdit, onEdit, onDelete, index }: { item: any; canEdit: boolean; onEdit: (item: any) => void; onDelete: (id: string) => void; index: number }) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isDefault = item.is_default;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid border-b hover:bg-muted/20 transition-colors",
        canEdit ? "grid-cols-[40px_200px_120px_100px]" : "grid-cols-[200px_120px]",
        index % 2 === 1 ? 'bg-muted/10' : '',
        isDefault ? 'border-b-2 border-border' : 'border-border'
      )}
    >
      {canEdit && (
        <div className="px-4 py-3 flex items-center border-r border-border">
          <div {...attributes} {...listeners} className="cursor-move">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
      <div className="px-4 py-3 font-medium flex items-center justify-center border-r border-border">{item.label}</div>
      <div className={cn("px-4 py-3 flex items-center justify-center", canEdit ? "border-r border-border" : "")}>
        {item.is_default && <Badge variant="secondary">{t('masterdata.isDefault')}</Badge>}
      </div>
      {canEdit && (
        <div className="px-4 py-3 flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('masterdata.deleteItem')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('masterdata.deleteConfirm')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(item.id)}>
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

export function MasterDataItemList({
  items,
  isLoading,
  canEdit,
  onEdit,
  onDelete,
  onReorder,
}: MasterDataItemListProps) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('masterdata.noItems')}
      </div>
    );
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order_index: index,
      }));
      
      onReorder(reorderedItems);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="border rounded-lg overflow-hidden">
        {/* Header Row */}
        <div className={cn(
          "grid bg-background border-b border-border",
          canEdit ? "grid-cols-[40px_200px_120px_100px]" : "grid-cols-[200px_120px]"
        )}>
          {canEdit && <div className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border text-center"></div>}
          <div className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border text-center">{t('masterdata.label')}</div>
          <div className={cn("px-4 py-3 text-sm font-semibold text-foreground text-center", canEdit ? "border-r border-border" : "")}>{t('masterdata.isDefault')}</div>
          {canEdit && <div className="px-4 py-3 text-sm font-semibold text-foreground text-center">{t('common.actions')}</div>}
        </div>

        {/* Body Rows */}
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              item={item}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              index={index}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}
