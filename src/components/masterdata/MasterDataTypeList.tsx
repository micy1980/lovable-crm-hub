import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Users, FolderKanban, TrendingUp, FileSignature, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MasterDataCategory {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  types: string[];
}

const MASTER_DATA_CATEGORIES: MasterDataCategory[] = [
  {
    key: 'partners',
    label: 'Partnerek',
    icon: Users,
    types: ['PARTNER_CATEGORY', 'COUNTRY', 'COUNTY', 'STREET_TYPE'],
  },
  {
    key: 'projects',
    label: 'Projektek',
    icon: FolderKanban,
    types: ['PROJECT_STATUS', 'COST_CATEGORY'],
  },
  {
    key: 'sales',
    label: 'Értékesítés',
    icon: TrendingUp,
    types: ['SALES_STATUS', 'BUSINESS_UNIT'],
  },
  {
    key: 'contracts',
    label: 'Szerződések',
    icon: FileSignature,
    types: ['CONTRACT_TYPE', 'CONTRACT_STATUS', 'PAYMENT_FREQUENCY'],
  },
  {
    key: 'tasks',
    label: 'Feladatok',
    icon: CalendarCheck,
    types: ['TASK_STATUS'],
  },
];

interface MasterDataTypeListProps {
  selectedType: string | null;
  onSelectType: (type: string) => void;
}

export function MasterDataTypeList({ selectedType, onSelectType }: MasterDataTypeListProps) {
  const { t } = useTranslation();
  
  // Find which category contains the selected type
  const selectedCategory = MASTER_DATA_CATEGORIES.find(cat => 
    selectedType && cat.types.includes(selectedType)
  );
  
  const [openCategories, setOpenCategories] = useState<string[]>(
    selectedCategory ? [selectedCategory.key] : []
  );

  const toggleCategory = (categoryKey: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryKey)
        ? prev.filter(k => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  return (
    <Card className="p-2">
      <div className="space-y-1">
        {MASTER_DATA_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isOpen = openCategories.includes(category.key);
          const hasSelectedType = selectedType && category.types.includes(selectedType);
          
          return (
            <Collapsible
              key={category.key}
              open={isOpen}
              onOpenChange={() => toggleCategory(category.key)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between",
                    hasSelectedType && "bg-accent"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-0.5 mt-1">
                {category.types.map((type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sm h-8"
                    onClick={() => onSelectType(type)}
                  >
                    {t(`masterdata.types.${type}`)}
                  </Button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
}
