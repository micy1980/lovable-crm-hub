import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface MasterDataItemListProps {
  items: any[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onReorder: (items: any[]) => void;
}

export function MasterDataItemList({
  items,
  isLoading,
  canEdit,
  onEdit,
  onDelete,
}: MasterDataItemListProps) {
  const { t } = useTranslation();

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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {canEdit && <TableHead className="w-12"></TableHead>}
          <TableHead>{t('masterdata.label')}</TableHead>
          <TableHead>{t('masterdata.value')}</TableHead>
          <TableHead>{t('masterdata.order')}</TableHead>
          <TableHead>{t('masterdata.isDefault')}</TableHead>
          {canEdit && <TableHead className="text-right">{t('common.actions')}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            {canEdit && (
              <TableCell>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              </TableCell>
            )}
            <TableCell className="font-medium">{item.label}</TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-2 py-1 rounded">{item.value}</code>
            </TableCell>
            <TableCell>{item.order_index}</TableCell>
            <TableCell>
              {item.is_default && <Badge variant="secondary">{t('masterdata.isDefault')}</Badge>}
            </TableCell>
            {canEdit && (
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
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
        ))}
      </TableBody>
    </Table>
  );
}
