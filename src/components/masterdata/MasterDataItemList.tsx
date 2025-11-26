import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

  const isEven = index % 2 === 0;

  return (
    <TableRow ref={setNodeRef} style={style} className={`h-11 ${isEven ? 'bg-muted/30' : ''}`}>
      {canEdit && (
        <TableCell className="w-12 py-2">
          <div {...attributes} {...listeners} className="cursor-move">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </TableCell>
      )}
      <TableCell className="font-medium py-2">{item.label}</TableCell>
      <TableCell className="py-2">
        {item.is_default && <Badge variant="secondary">{t('masterdata.isDefault')}</Badge>}
      </TableCell>
      {canEdit && (
        <TableCell className="text-right py-2">
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
        </TableCell>
      )}
    </TableRow>
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
      <Table>
        <TableHeader>
          <TableRow>
            {canEdit && <TableHead className="w-12"></TableHead>}
            <TableHead>{t('masterdata.label')}</TableHead>
            <TableHead>{t('masterdata.isDefault')}</TableHead>
            {canEdit && <TableHead className="text-right">{t('common.actions')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
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
        </TableBody>
      </Table>
    </DndContext>
  );
}
