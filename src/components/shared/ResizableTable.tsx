import React, { useRef, useCallback, useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ColumnState, ColumnConfig } from '@/hooks/useColumnSettings';

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface ResizableTableBaseProps {
  visibleColumns: ColumnState[];
  onColumnResize: (key: string, width: number) => void;
  onColumnReorder?: (fromIndex: number, toIndex: number) => void;
  sortState?: SortState | null;
  onSort?: (key: string) => void;
  className?: string;
}

interface ResizableTableWithRenderProps extends ResizableTableBaseProps {
  renderHeader: (column: ColumnState) => React.ReactNode;
  renderRow: (item: any, columns: ColumnState[]) => React.ReactNode;
  data: any[];
  actionColumnWidth?: number;
  actionColumnHeader?: string;
  columnConfigs?: ColumnConfig[];
  selectHeader?: React.ReactNode;
  children?: never;
}

interface ResizableTableWithChildrenProps extends ResizableTableBaseProps {
  getColumnConfig: (key: string) => ColumnConfig | undefined;
  children: React.ReactNode;
  selectHeader?: React.ReactNode;
  renderHeader?: never;
  renderRow?: never;
  data?: never;
  actionColumnWidth?: never;
}

type ResizableTableProps = ResizableTableWithRenderProps | ResizableTableWithChildrenProps;

function SortIndicator({ columnKey, sortState }: { columnKey: string; sortState?: SortState | null }) {
  if (!sortState || sortState.key !== columnKey) {
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
  }
  return sortState.direction === 'asc' 
    ? <ArrowUp className="h-3 w-3 text-primary" />
    : <ArrowDown className="h-3 w-3 text-primary" />;
}

export function ResizableTable(props: ResizableTableProps) {
  const {
    visibleColumns,
    onColumnResize,
    onColumnReorder,
    sortState,
    onSort,
    className,
  } = props;

  const [resizing, setResizing] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const columnKey = useRef<string | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, key: string, currentWidth: number) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(key);
      startX.current = e.clientX;
      startWidth.current = currentWidth;
      columnKey.current = key;

      const handleMouseMove = (e: MouseEvent) => {
        if (columnKey.current) {
          const diff = e.clientX - startX.current;
          const newWidth = Math.max(50, startWidth.current + diff);
          onColumnResize(columnKey.current, newWidth);
        }
      };

      const handleMouseUp = () => {
        setResizing(null);
        columnKey.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onColumnResize]
  );

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex && onColumnReorder) {
      onColumnReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleHeaderClick = (key: string, sortable: boolean | undefined) => {
    if (sortable !== false && onSort) {
      onSort(key);
    }
  };

  // Children-based version (new)
  if ('children' in props && props.children && 'getColumnConfig' in props) {
    const { getColumnConfig, children, selectHeader } = props as ResizableTableWithChildrenProps;
    
    return (
      <div className={cn('overflow-x-auto rounded-md border', className)}>
        <Table style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col, index) => {
                const config = getColumnConfig(col.key);
                const isSortable = config?.sortable !== false && onSort;
                
                return (
                  <TableHead
                    key={col.key}
                    style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                    className={cn(
                      'relative select-none',
                      dragOverIndex === index && 'bg-accent',
                      draggedIndex === index && 'opacity-50',
                      isSortable && 'cursor-pointer hover:bg-muted/50'
                    )}
                    draggable={!!onColumnReorder}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleHeaderClick(col.key, config?.sortable)}
                  >
                    <div className="flex items-center justify-center gap-1 w-full">
                      {onColumnReorder && col.key !== 'select' && (
                        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab" />
                      )}
                      {col.key === 'select' && selectHeader ? (
                        selectHeader
                      ) : (
                        <span className="truncate">{config?.label || col.key}</span>
                      )}
                      {col.key !== 'select' && col.key !== 'favorite' && col.key !== 'actions' && onSort && (
                        <SortIndicator columnKey={col.key} sortState={sortState} />
                      )}
                    </div>
                    <div
                      className={cn(
                        'absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors',
                        resizing === col.key && 'bg-primary'
                      )}
                      onMouseDown={(e) => handleMouseDown(e, col.key, col.width)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          {children}
        </Table>
      </div>
    );
  }

  const { renderHeader, renderRow, data, actionColumnWidth = 80, actionColumnHeader = '', columnConfigs, selectHeader } = props as ResizableTableWithRenderProps;

  const isColumnSortable = (key: string): boolean => {
    if (!onSort) return false;
    if (!columnConfigs) return true;
    const config = columnConfigs.find(c => c.key === key);
    return config?.sortable !== false;
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <Table style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((col, index) => {
              const sortable = isColumnSortable(col.key);
              return (
              <TableHead
                key={col.key}
                style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                className={cn(
                  'relative select-none',
                  dragOverIndex === index && 'bg-accent',
                  draggedIndex === index && 'opacity-50',
                  sortable && 'cursor-pointer hover:bg-muted/50'
                )}
                draggable={!!onColumnReorder && col.key !== 'select'}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => sortable && onSort && onSort(col.key)}
              >
                <div className="flex items-center justify-center gap-1 w-full">
                  {onColumnReorder && col.key !== 'select' && (
                    <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab" />
                  )}
                  {col.key === 'select' && selectHeader ? (
                    selectHeader
                  ) : (
                    <span className="truncate">{renderHeader(col)}</span>
                  )}
                  {col.key !== 'select' && col.key !== 'favorite' && col.key !== 'actions' && onSort && (
                    <SortIndicator columnKey={col.key} sortState={sortState} />
                  )}
                </div>
                <div
                  className={cn(
                    'absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors',
                    resizing === col.key && 'bg-primary'
                  )}
                  onMouseDown={(e) => handleMouseDown(e, col.key, col.width)}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        {data.map((item) => renderRow(item, visibleColumns))}
      </Table>
    </div>
  );
}

interface ResizableTableCellProps {
  width: number;
  children: React.ReactNode;
  className?: string;
}

export function ResizableTableCell({ width, children, className }: ResizableTableCellProps) {
  return (
    <td
      style={{ width, minWidth: width, maxWidth: width }}
      className={cn('truncate px-3 py-2 align-middle border-r border-border last:border-r-0 [&:has([role=checkbox])]:text-center', className)}
    >
      {children}
    </td>
  );
}
