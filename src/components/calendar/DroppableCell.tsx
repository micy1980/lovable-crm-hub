import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface DroppableCellProps {
  id: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const DroppableCell = ({ id, children, className, onClick }: DroppableCellProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "bg-primary/20 ring-2 ring-primary ring-inset"
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
