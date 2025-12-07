import { useState } from 'react';
import { Plus, X, Check, Tag as TagIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTags, useEntityTags, TagEntityType, Tag, TagWithUsage } from '@/hooks/useTags';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { isAdminOrAbove } from '@/lib/roleUtils';
import { useUserProfile } from '@/hooks/useUserProfile';

const TAG_COLORS = [
  { name: 'red', bg: 'bg-red-500', text: 'text-white' },
  { name: 'orange', bg: 'bg-orange-500', text: 'text-white' },
  { name: 'yellow', bg: 'bg-yellow-500', text: 'text-black' },
  { name: 'green', bg: 'bg-green-500', text: 'text-white' },
  { name: 'blue', bg: 'bg-blue-500', text: 'text-white' },
  { name: 'purple', bg: 'bg-purple-500', text: 'text-white' },
  { name: 'pink', bg: 'bg-pink-500', text: 'text-white' },
  { name: 'indigo', bg: 'bg-indigo-500', text: 'text-white' },
  { name: 'teal', bg: 'bg-teal-500', text: 'text-white' },
  { name: 'cyan', bg: 'bg-cyan-500', text: 'text-black' },
];

const getTagColor = (colorName: string) => {
  return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[4]; // default blue
};

interface TagSelectorProps {
  entityType: TagEntityType;
  entityId: string;
  variant?: 'inline' | 'popover';
  className?: string;
}

export function TagSelector({ 
  entityType, 
  entityId, 
  variant = 'popover',
  className 
}: TagSelectorProps) {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const isAdmin = isAdminOrAbove(profile);
  const { tags, createTag, deleteTag } = useTags();
  const { entityTags, hasTag, toggleTag, removeTag } = useEntityTags(entityType, entityId);
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');
  const [showNewTagForm, setShowNewTagForm] = useState(false);

  const handleDeleteTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTag.mutate(tagId);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    const result = await createTag.mutateAsync({ 
      name: newTagName.trim(), 
      color: newTagColor 
    });
    
    if (result) {
      toggleTag(result.id);
      setNewTagName('');
      setShowNewTagForm(false);
    }
  };

  const assignedTags = entityTags
    .map(et => et.tag)
    .filter((tag): tag is Tag => tag !== undefined);

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {/* Display assigned tags */}
      {assignedTags.map(tag => {
        const color = getTagColor(tag.color);
        return (
          <Badge
            key={tag.id}
            variant="secondary"
            className={cn(
              'gap-1 text-xs cursor-pointer transition-colors',
              color.bg, color.text
            )}
            onClick={(e) => {
              e.stopPropagation();
              removeTag.mutate(tag.id);
            }}
          >
            {tag.name}
            <X className="h-3 w-3" />
          </Badge>
        );
      })}

      {/* Add tag button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <TagIcon className="h-3 w-3" />
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start" onClick={(e) => e.stopPropagation()}>
          <Command>
            <CommandInput placeholder={t('tags.search')} />
            <CommandList>
              <CommandEmpty>{t('tags.noTags')}</CommandEmpty>
              <CommandGroup heading={t('tags.available')}>
                {tags.map(tag => {
                  const color = getTagColor(tag.color);
                  const isAssigned = hasTag(tag.id);
                  const canDelete = isAdmin && tag.usageCount === 0;
                  return (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => toggleTag(tag.id)}
                      className="flex items-center gap-2"
                    >
                      <div className={cn('w-3 h-3 rounded-full', color.bg)} />
                      <span className="flex-1">{tag.name}</span>
                      {isAssigned && <Check className="h-4 w-4" />}
                      {isAdmin && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canDelete) handleDeleteTag(tag.id, e);
                                }}
                                className={cn(
                                  'p-0.5 rounded hover:bg-muted transition-colors',
                                  canDelete 
                                    ? 'text-destructive hover:text-destructive cursor-pointer' 
                                    : 'text-muted-foreground/40 cursor-not-allowed'
                                )}
                                disabled={!canDelete}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {canDelete 
                                ? t('tags.deleteTag')
                                : t('tags.cannotDelete', { count: tag.usageCount })
                              }
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {isAdmin && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {showNewTagForm ? (
                      <div className="p-2 space-y-2">
                        <Input
                          placeholder={t('tags.newTagName')}
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateTag();
                            }
                          }}
                        />
                        <div className="flex flex-wrap gap-1">
                          {TAG_COLORS.map(color => (
                            <button
                              key={color.name}
                              type="button"
                              className={cn(
                                'w-5 h-5 rounded-full transition-all',
                                color.bg,
                                newTagColor === color.name && 'ring-2 ring-offset-2 ring-primary'
                              )}
                              onClick={() => setNewTagColor(color.name)}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 h-7"
                            onClick={handleCreateTag}
                            disabled={!newTagName.trim() || createTag.isPending}
                          >
                            {t('common.create')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7"
                            onClick={() => {
                              setShowNewTagForm(false);
                              setNewTagName('');
                            }}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <CommandItem
                        onSelect={() => setShowNewTagForm(true)}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        {t('tags.createNew')}
                      </CommandItem>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Simple display component for showing tags (read-only)
export function TagDisplay({ 
  entityType, 
  entityId,
  className 
}: { 
  entityType: TagEntityType; 
  entityId: string;
  className?: string;
}) {
  const { entityTags } = useEntityTags(entityType, entityId);

  const assignedTags = entityTags
    .map(et => et.tag)
    .filter((tag): tag is Tag => tag !== undefined);

  if (assignedTags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {assignedTags.map(tag => {
        const color = getTagColor(tag.color);
        return (
          <Badge
            key={tag.id}
            variant="secondary"
            className={cn('text-xs', color.bg, color.text)}
          >
            {tag.name}
          </Badge>
        );
      })}
    </div>
  );
}
