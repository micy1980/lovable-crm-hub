import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ReactNode, MouseEvent } from 'react';

interface DroppableCellProps {
  id: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent) => void;
}

export const DroppableCell = ({ id, children, className, onClick }: DroppableCellProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  const handleClick = (e: MouseEvent) => {
    // Only trigger if clicking directly on the cell, not on children (tasks)
    if (e.target === e.currentTarget && onClick) {
      onClick(e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "bg-primary/20 ring-2 ring-primary ring-inset"
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};
