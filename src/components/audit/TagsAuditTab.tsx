import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable } from '@/components/shared/ResizableTable';
import { useSortableData } from '@/hooks/useSortableData';
import { TagEntityType } from '@/hooks/useTags';

const TAG_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  cyan: 'bg-cyan-500',
  gray: 'bg-gray-500',
};

const ENTITY_TYPE_LABELS: Record<TagEntityType, string> = {
  partner: 'Partner',
  project: 'Projekt',
  sales: 'Értékesítés',
  contract: 'Szerződés',
  document: 'Dokumentum',
  task: 'Feladat',
  event: 'Esemény',
};

interface TagWithAssignments {
  id: string;
  name: string;
  color: string;
  company_id: string;
  company_name: string;
  created_at: string;
  assignments: {
    entity_type: TagEntityType;
    entity_id: string;
    entity_name: string;
  }[];
}

export const TagsAuditTab = () => {
  const { t } = useTranslation();
  const [companyFilter, setCompanyFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'name', label: 'Címke', required: true, defaultWidth: 150 },
    { key: 'color', label: 'Szín', defaultWidth: 80 },
    { key: 'company', label: 'Vállalat', defaultWidth: 150 },
    { key: 'usage_count', label: 'Használat', defaultWidth: 100 },
    { key: 'assignments', label: 'Hozzárendelések', defaultWidth: 400 },
    { key: 'created_at', label: 'Létrehozva', defaultWidth: 150 },
  ], []);

  const {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({
    storageKey: 'logs-tags-column-settings',
    columns: columnConfigs,
  });

  const { data: tagsWithAssignments = [], isLoading } = useQuery({
    queryKey: ['tags-with-assignments-audit'],
    staleTime: 0,
    queryFn: async () => {
      // Fetch all tags with company info
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('*, companies:company_id(name)')
        .order('name');

      if (tagsError) throw tagsError;

      // Fetch all entity_tags
      const { data: entityTags, error: entityTagsError } = await supabase
        .from('entity_tags')
        .select('*');

      if (entityTagsError) throw entityTagsError;

      // Fetch entity names for each entity type
      const entityIds: Record<TagEntityType, Set<string>> = {
        partner: new Set(),
        project: new Set(),
        sales: new Set(),
        contract: new Set(),
        document: new Set(),
        task: new Set(),
        event: new Set(),
      };

      entityTags?.forEach((et) => {
        const type = et.entity_type as TagEntityType;
        if (entityIds[type]) {
          entityIds[type].add(et.entity_id);
        }
      });

      // Fetch names for each entity type
      const entityNames: Record<string, string> = {};

      const fetchPromises = [];

      if (entityIds.partner.size > 0) {
        fetchPromises.push(
          supabase
            .from('partners')
            .select('id, name')
            .in('id', Array.from(entityIds.partner))
            .then(({ data }) => {
              data?.forEach((p) => (entityNames[p.id] = p.name));
            })
        );
      }

      if (entityIds.project.size > 0) {
        fetchPromises.push(
          supabase
            .from('projects')
            .select('id, name')
            .in('id', Array.from(entityIds.project))
            .then(({ data }) => {
              data?.forEach((p) => (entityNames[p.id] = p.name));
            })
        );
      }

      if (entityIds.sales.size > 0) {
        fetchPromises.push(
          supabase
            .from('sales')
            .select('id, name')
            .in('id', Array.from(entityIds.sales))
            .then(({ data }) => {
              data?.forEach((s) => (entityNames[s.id] = s.name));
            })
        );
      }

      if (entityIds.contract.size > 0) {
        fetchPromises.push(
          supabase
            .from('contracts')
            .select('id, title')
            .in('id', Array.from(entityIds.contract))
            .then(({ data }) => {
              data?.forEach((c) => (entityNames[c.id] = c.title));
            })
        );
      }

      if (entityIds.document.size > 0) {
        fetchPromises.push(
          supabase
            .from('documents')
            .select('id, title')
            .in('id', Array.from(entityIds.document))
            .then(({ data }) => {
              data?.forEach((d) => (entityNames[d.id] = d.title));
            })
        );
      }

      if (entityIds.task.size > 0) {
        fetchPromises.push(
          supabase
            .from('tasks')
            .select('id, title')
            .in('id', Array.from(entityIds.task))
            .then(({ data }) => {
              data?.forEach((t) => (entityNames[t.id] = t.title));
            })
        );
      }

      if (entityIds.event.size > 0) {
        fetchPromises.push(
          supabase
            .from('events')
            .select('id, title')
            .in('id', Array.from(entityIds.event))
            .then(({ data }) => {
              data?.forEach((e) => (entityNames[e.id] = e.title));
            })
        );
      }

      await Promise.all(fetchPromises);

      // Build tag assignments
      const result: TagWithAssignments[] = tags.map((tag: any) => {
        const tagEntityTags = entityTags?.filter((et) => et.tag_id === tag.id) || [];
        const assignments = tagEntityTags.map((et) => ({
          entity_type: et.entity_type as TagEntityType,
          entity_id: et.entity_id,
          entity_name: entityNames[et.entity_id] || et.entity_id,
        }));

        return {
          id: tag.id,
          name: tag.name,
          color: tag.color || 'blue',
          company_id: tag.company_id,
          company_name: tag.companies?.name || '',
          created_at: tag.created_at,
          assignments,
        };
      });

      return result;
    },
  });

  // Filter tags
  const filteredTags = tagsWithAssignments.filter((tag) => {
    const matchesCompany =
      companyFilter === '' ||
      tag.company_name.toLowerCase().includes(companyFilter.toLowerCase());
    const matchesTag =
      tagFilter === '' || tag.name.toLowerCase().includes(tagFilter.toLowerCase());
    return matchesCompany && matchesTag;
  });

  const { sortedData, sortState, handleSort } = useSortableData({
    data: filteredTags,
    sortFunctions: {
      name: (a, b) => a.name.localeCompare(b.name, 'hu'),
      color: (a, b) => a.color.localeCompare(b.color),
      company: (a, b) => a.company_name.localeCompare(b.company_name, 'hu'),
      usage_count: (a, b) => a.assignments.length - b.assignments.length,
      created_at: (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
  });

  const renderCellContent = (tag: TagWithAssignments, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        return <span className="font-medium">{tag.name}</span>;
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${TAG_COLORS[tag.color] || 'bg-gray-500'}`} />
            <span className="text-xs text-muted-foreground">{tag.color}</span>
          </div>
        );
      case 'company':
        return <span className="text-sm">{tag.company_name}</span>;
      case 'usage_count':
        return (
          <Badge variant={tag.assignments.length > 0 ? 'default' : 'secondary'}>
            {tag.assignments.length}
          </Badge>
        );
      case 'assignments':
        if (tag.assignments.length === 0) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {tag.assignments.slice(0, 5).map((a, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {ENTITY_TYPE_LABELS[a.entity_type]}: {a.entity_name}
              </Badge>
            ))}
            {tag.assignments.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{tag.assignments.length - 5}
              </Badge>
            )}
          </div>
        );
      case 'created_at':
        return (
          <span className="font-mono text-xs">
            {new Date(tag.created_at).toLocaleString('hu-HU')}
          </span>
        );
      default:
        return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Címke szűrő</label>
          <input
            type="text"
            placeholder="Keresés címkére..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Vállalat szűrő</label>
          <input
            type="text"
            placeholder="Keresés vállalatra..."
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>
        <div className="flex items-end">
          <ColumnSettingsPopover
            columnStates={columnStates}
            columns={columnConfigs}
            onToggleVisibility={toggleVisibility}
            onReorder={reorderColumns}
            onReset={resetToDefaults}
          />
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nincs címke</p>
        </div>
      ) : (
        <ResizableTable
          visibleColumns={visibleColumns}
          getColumnConfig={getColumnConfig}
          onColumnResize={setColumnWidth}
          onColumnReorder={reorderColumns}
          sortState={sortState}
          onSort={handleSort}
        >
          <TableBody>
            {sortedData.map((tag) => (
              <TableRow key={tag.id} className="h-10">
                {visibleColumns.map((col) => (
                  <TableCell key={col.key} className="py-2" style={{ width: col.width }}>
                    {renderCellContent(tag, col.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </ResizableTable>
      )}
    </div>
  );
};
