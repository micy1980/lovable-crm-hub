import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const MASTER_DATA_TYPES = [
  'PARTNER_CATEGORY',
  'PROJECT_STATUS',
  'SALES_STATUS',
  'COST_CATEGORY',
  'BUSINESS_UNIT',
  'TASK_STATUS',
];

interface MasterDataTypeListProps {
  selectedType: string | null;
  onSelectType: (type: string) => void;
}

export function MasterDataTypeList({ selectedType, onSelectType }: MasterDataTypeListProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-2">
      <div className="space-y-0">
        {MASTER_DATA_TYPES.map((type, index) => (
          <div key={type}>
            <Button
              variant={selectedType === type ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => onSelectType(type)}
            >
              {t(`masterdata.types.${type}`)}
            </Button>
            {index < MASTER_DATA_TYPES.length - 1 && (
              <div className="border-b border-border my-1" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
