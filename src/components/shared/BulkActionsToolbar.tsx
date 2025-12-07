import React from 'react';
import { X, Trash2, UserCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  onClick: () => void;
  disabled?: boolean;
}

export interface StatusOption {
  value: string;
  label: string;
}

export interface UserOption {
  id: string;
  name: string;
}

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete?: () => void;
  onBulkStatusChange?: (status: string) => void;
  onBulkOwnerChange?: (userId: string) => void;
  statusOptions?: StatusOption[];
  userOptions?: UserOption[];
  customActions?: BulkAction[];
  showDelete?: boolean;
  showStatusChange?: boolean;
  showOwnerChange?: boolean;
  deleteLabel?: string;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkStatusChange,
  onBulkOwnerChange,
  statusOptions = [],
  userOptions = [],
  customActions = [],
  showDelete = true,
  showStatusChange = true,
  showOwnerChange = true,
  deleteLabel,
}: BulkActionsToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg mb-4">
      <span className="text-sm font-medium">
        {selectedCount} {t('common.selected', 'kiválasztva')}
      </span>

      <div className="flex items-center gap-2 ml-4">
        {/* Status Change Dropdown */}
        {showStatusChange && statusOptions.length > 0 && onBulkStatusChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('common.changeStatus', 'Státusz változtatás')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {statusOptions.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => onBulkStatusChange(status.value)}
                >
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Owner Change Dropdown */}
        {showOwnerChange && userOptions.length > 0 && onBulkOwnerChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <UserCheck className="h-4 w-4 mr-2" />
                {t('common.changeOwner', 'Felelős változtatás')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {userOptions.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  onClick={() => onBulkOwnerChange(user.id)}
                >
                  {user.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Delete Button */}
        {showDelete && onBulkDelete && (
          <Button variant="destructive" size="sm" onClick={onBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteLabel || t('common.delete', 'Törlés')}
          </Button>
        )}

        {/* Custom Actions */}
        {customActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>

      {/* Clear Selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="ml-auto"
      >
        <X className="h-4 w-4 mr-1" />
        {t('common.clearSelection', 'Kijelölés törlése')}
      </Button>
    </div>
  );
}
