import React, { useRef, useCallback, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ColumnState } from '@/hooks/useColumnSettings';

interface ResizableTableProps {
  visibleColumns: ColumnState[];
  onColumnResize: (key: string, width: number) => void;
  onColumnReorder?: (fromIndex: number, toIndex: number) => void;
  renderHeader: (column: ColumnState) => React.ReactNode;
  renderRow: (item: any, columns: ColumnState[]) => React.ReactNode;
  data: any[];
  actionColumnWidth?: number;
  className?: string;
}

export function ResizableTable({
  visibleColumns,
  onColumnResize,
  onColumnReorder,
  renderHeader,
  renderRow,
  data,
  actionColumnWidth = 80,
  className,
}: ResizableTableProps) {
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

  return (
    <div className={cn('overflow-x-auto', className)}>
      <Table style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((col, index) => (
              <TableHead
                key={col.key}
                style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                className={cn(
                  'relative select-none',
                  dragOverIndex === index && 'bg-accent',
                  draggedIndex === index && 'opacity-50'
                )}
                draggable={!!onColumnReorder}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center gap-1 pr-2">
                  {onColumnReorder && (
                    <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab" />
                  )}
                  <span className="truncate">{renderHeader(col)}</span>
                </div>
                <div
                  className={cn(
                    'absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors',
                    resizing === col.key && 'bg-primary'
                  )}
                  onMouseDown={(e) => handleMouseDown(e, col.key, col.width)}
                />
              </TableHead>
            ))}
            <TableHead style={{ width: actionColumnWidth }}>
              {/* Actions column - no resize */}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => renderRow(item, visibleColumns))}
        </TableBody>
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
    <TableCell
      style={{ width, minWidth: width, maxWidth: width }}
      className={cn('truncate', className)}
    >
      {children}
    </TableCell>
  );
}
