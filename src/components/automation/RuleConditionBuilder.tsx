import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TriggerType, ActionType } from '@/hooks/useAutomationRules';

interface RuleConditionBuilderProps {
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  onTriggerConfigChange: (config: Record<string, any>) => void;
  actionType: ActionType;
  actionConfig: Record<string, any>;
  onActionConfigChange: (config: Record<string, any>) => void;
}

export const RuleConditionBuilder = ({
  triggerType,
  triggerConfig,
  onTriggerConfigChange,
  actionType,
  actionConfig,
  onActionConfigChange,
}: RuleConditionBuilderProps) => {
  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'task_status_change':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Eredeti státusz</Label>
              <Select
                value={triggerConfig.from_status || ''}
                onValueChange={(v) =>
                  onTriggerConfigChange({ ...triggerConfig, from_status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bármely" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Bármely</SelectItem>
                  <SelectItem value="todo">Tennivaló</SelectItem>
                  <SelectItem value="in_progress">Folyamatban</SelectItem>
                  <SelectItem value="done">Kész</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Új státusz</Label>
              <Select
                value={triggerConfig.to_status || ''}
                onValueChange={(v) =>
                  onTriggerConfigChange({ ...triggerConfig, to_status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bármely" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Bármely</SelectItem>
                  <SelectItem value="todo">Tennivaló</SelectItem>
                  <SelectItem value="in_progress">Folyamatban</SelectItem>
                  <SelectItem value="done">Kész</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'deadline_approaching':
        return (
          <div className="space-y-2">
            <Label>Nappal a határidő előtt</Label>
            <Input
              type="number"
              min={1}
              value={triggerConfig.days_before || 3}
              onChange={(e) =>
                onTriggerConfigChange({
                  ...triggerConfig,
                  days_before: parseInt(e.target.value) || 3,
                })
              }
            />
          </div>
        );

      case 'new_task':
      case 'new_sales':
        return (
          <p className="text-sm text-muted-foreground">
            Ez az esemény automatikusan aktiválódik új elem létrehozásakor.
          </p>
        );

      default:
        return null;
    }
  };

  const renderActionConfig = () => {
    switch (actionType) {
      case 'send_notification':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Értesítés címe</Label>
              <Input
                value={actionConfig.title || ''}
                onChange={(e) =>
                  onActionConfigChange({ ...actionConfig, title: e.target.value })
                }
                placeholder="Pl. Határidő közeleg"
              />
            </div>
            <div className="space-y-2">
              <Label>Értesítés szövege</Label>
              <Input
                value={actionConfig.message || ''}
                onChange={(e) =>
                  onActionConfigChange({ ...actionConfig, message: e.target.value })
                }
                placeholder="Pl. A feladat határideje hamarosan lejár"
              />
            </div>
          </div>
        );

      case 'change_status':
        return (
          <div className="space-y-2">
            <Label>Új státusz</Label>
            <Select
              value={actionConfig.new_status || ''}
              onValueChange={(v) =>
                onActionConfigChange({ ...actionConfig, new_status: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Válasszon státuszt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">Tennivaló</SelectItem>
                <SelectItem value="in_progress">Folyamatban</SelectItem>
                <SelectItem value="done">Kész</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'assign_user':
        return (
          <div className="space-y-2">
            <Label>Hozzárendelés típusa</Label>
            <Select
              value={actionConfig.assign_type || 'project_owner'}
              onValueChange={(v) =>
                onActionConfigChange({ ...actionConfig, assign_type: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Válasszon típust" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project_owner">Projekt tulajdonos</SelectItem>
                <SelectItem value="project_responsible">Projekt felelős</SelectItem>
                <SelectItem value="creator">Létrehozó</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'create_task':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Feladat címe</Label>
              <Input
                value={actionConfig.task_title || ''}
                onChange={(e) =>
                  onActionConfigChange({ ...actionConfig, task_title: e.target.value })
                }
                placeholder="Pl. Követő feladat"
              />
            </div>
            <div className="space-y-2">
              <Label>Határidő (napok)</Label>
              <Input
                type="number"
                min={1}
                value={actionConfig.deadline_days || 7}
                onChange={(e) =>
                  onActionConfigChange({
                    ...actionConfig,
                    deadline_days: parseInt(e.target.value) || 7,
                  })
                }
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
            1
          </span>
          Feltételek
        </h4>
        <div className="pl-8">{renderTriggerConfig()}</div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
            2
          </span>
          Akció beállítások
        </h4>
        <div className="pl-8">{renderActionConfig()}</div>
      </div>
    </div>
  );
};
