import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MasterDataTypeList } from './MasterDataTypeList';
import { MasterDataItemList } from './MasterDataItemList';
import { MasterDataItemDialog } from './MasterDataItemDialog';
import { useMasterData } from '@/hooks/useMasterData';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';

export function MasterDataManager() {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { items, isLoading, createItem, updateItem, deleteItem, reorderItems } = useMasterData(selectedType);

  const canEdit = isSuperAdmin(profile);

  const handleCreate = (data: any) => {
    if (!selectedType) return;
    createItem.mutate(
      { ...data, type: selectedType },
      { onSuccess: () => setIsCreateOpen(false) }
    );
  };

  const handleUpdate = (data: any) => {
    if (!editingItem) return;
    updateItem.mutate(
      { id: editingItem.id, ...data },
      { onSuccess: () => setEditingItem(null) }
    );
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('masterdata.title')}</CardTitle>
        <CardDescription>{t('masterdata.description')}</CardDescription>
        {!canEdit && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{t('settings.masterDataReadOnly')}</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          <div className="md:col-span-1">
            <MasterDataTypeList
              selectedType={selectedType}
              onSelectType={setSelectedType}
            />
          </div>

          <div className="flex-1">
            {!selectedType ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                {t('masterdata.selectType')}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {t(`masterdata.types.${selectedType}`)}
                  </h3>
                  {canEdit && (
                    <Button onClick={() => setIsCreateOpen(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('masterdata.addItem')}
                    </Button>
                  )}
                </div>

                <MasterDataItemList
                  items={items}
                  isLoading={isLoading}
                  canEdit={canEdit}
                  onEdit={setEditingItem}
                  onDelete={handleDelete}
                  onReorder={(reorderedItems) => reorderItems.mutate(reorderedItems)}
                />
              </>
            )}
          </div>
        </div>

        <MasterDataItemDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={handleCreate}
          isSubmitting={createItem.isPending}
          title={t('masterdata.addItem')}
        />

        <MasterDataItemDialog
          open={!!editingItem}
          onOpenChange={() => setEditingItem(null)}
          onSubmit={handleUpdate}
          isSubmitting={updateItem.isPending}
          initialData={editingItem}
          title={t('masterdata.editItem')}
        />
      </CardContent>
    </Card>
  );
}
