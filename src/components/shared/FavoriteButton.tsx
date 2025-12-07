import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites, FavoriteEntityType } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  entityType: FavoriteEntityType;
  entityId: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export function FavoriteButton({ 
  entityType, 
  entityId, 
  variant = 'icon',
  className 
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, addFavorite, removeFavorite } = useFavorites();
  const isActive = isFavorite(entityType, entityId);
  const isPending = addFavorite.isPending || removeFavorite.isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entityType, entityId);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'h-8 w-8 transition-colors',
        isActive && 'text-yellow-500 hover:text-yellow-600',
        className
      )}
    >
      <Star 
        className={cn(
          'h-4 w-4 transition-all',
          isActive && 'fill-current'
        )} 
      />
    </Button>
  );
}
