import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAutomationRules, TRIGGER_TYPES, ACTION_TYPES, TriggerType, ActionType } from '@/hooks/useAutomationRules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Plus, Trash2, Play, Pause, Edit, Settings } from 'lucide-react';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { AutomationLogsList } from '@/components/automation/AutomationLogsList';
import { RuleConditionBuilder } from '@/components/automation/RuleConditionBuilder';

const Automation = () => {
  const { t } = useTranslation();
  const { rules, createRule, updateRule, deleteRule, toggleRule, isLoading, isCreating } = useAutomationRules();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('task_status_change');
  const [actionType, setActionType] = useState<ActionType>('send_notification');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('rules');

  const resetForm = () => {
    setName('');
    setDescription('');
    setTriggerType('task_status_change');
    setActionType('send_notification');
    setTriggerConfig({});
    setActionConfig({});
    setEditingRule(null);
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    if (editingRule) {
      updateRule({
        id: editingRule.id,
        name,
        description: description || undefined,
        triggerType,
        triggerConfig,
        actionType,
        actionConfig,
      });
    } else {
      createRule({
        name,
        description: description || undefined,
        triggerType,
        triggerConfig,
        actionType,
        actionConfig,
      });
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setName(rule.name);
    setDescription(rule.description || '');
    setTriggerType(rule.trigger_type);
    setActionType(rule.action_type);
    setTriggerConfig(rule.trigger_config || {});
    setActionConfig(rule.action_config || {});
    setDialogOpen(true);
  };

  const handleToggle = (ruleId: string, currentState: boolean) => {
    toggleRule({ id: ruleId, isActive: !currentState });
  };

  const handleNewRule = () => {
    resetForm();
    setDialogOpen(true);
  };

  return (
    <LicenseGuard feature="projects">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Automatizáció</h1>
          </div>
          
          <Button onClick={handleNewRule}>
            <Plus className="h-4 w-4 mr-2" />
            Új szabály
          </Button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Összes szabály</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rules.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aktív</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {rules.filter(r => r.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inaktív</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {rules.filter(r => !r.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rules">Szabályok</TabsTrigger>
            <TabsTrigger value="logs">Végrehajtási napló</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nincsenek automatizációs szabályok</p>
                  <Button className="mt-4" onClick={handleNewRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Első szabály létrehozása
                  </Button>
                </CardContent>
              </Card>
            ) : (
              rules.map((rule) => (
                <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Aktív' : 'Inaktív'}
                          </Badge>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Trigger: <span className="font-medium text-foreground">
                              {TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label}
                            </span>
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-muted-foreground">
                            Akció: <span className="font-medium text-foreground">
                              {ACTION_TYPES.find(a => a.value === rule.action_type)?.label}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(rule.id, rule.is_active)}
                        >
                          {rule.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <AutomationLogsList />
          </TabsContent>
        </Tabs>

        {/* Create/Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Szabály szerkesztése' : 'Új automatizációs szabály'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Név *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Pl. Értesítés közelgő határidőről"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Leírás</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mikor és mit csinál..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Trigger (esemény)</Label>
                  <Select value={triggerType} onValueChange={(v) => {
                    setTriggerType(v as TriggerType);
                    setTriggerConfig({});
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Akció</Label>
                  <Select value={actionType} onValueChange={(v) => {
                    setActionType(v as ActionType);
                    setActionConfig({});
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <RuleConditionBuilder
                  triggerType={triggerType}
                  triggerConfig={triggerConfig}
                  onTriggerConfigChange={setTriggerConfig}
                  actionType={actionType}
                  actionConfig={actionConfig}
                  onActionConfigChange={setActionConfig}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Mégse
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
                {editingRule ? 'Mentés' : 'Létrehozás'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LicenseGuard>
  );
};

export default Automation;
