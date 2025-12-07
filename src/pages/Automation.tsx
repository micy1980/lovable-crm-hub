import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAutomationRules, TRIGGER_TYPES, ACTION_TYPES, TriggerType, ActionType } from '@/hooks/useAutomationRules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Zap, Plus, Trash2, Settings, Play, Pause } from 'lucide-react';
import { LicenseGuard } from '@/components/license/LicenseGuard';

const Automation = () => {
  const { t } = useTranslation();
  const { rules, createRule, updateRule, deleteRule, toggleRule, isLoading, isCreating } = useAutomationRules();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('task_status_change');
  const [actionType, setActionType] = useState<ActionType>('send_notification');

  const handleCreate = () => {
    if (!name.trim()) return;

    createRule({
      name,
      description: description || undefined,
      triggerType,
      triggerConfig: {},
      actionType,
      actionConfig: {},
    });

    setDialogOpen(false);
    setName('');
    setDescription('');
    setTriggerType('task_status_change');
    setActionType('send_notification');
  };

  const handleToggle = (ruleId: string, currentState: boolean) => {
    toggleRule({ id: ruleId, isActive: !currentState });
  };

  return (
    <LicenseGuard feature="projects">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Automatizáció</h1>
          </div>
          
          <Button onClick={() => setDialogOpen(true)}>
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

        {/* Rules list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nincsenek automatizációs szabályok</p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
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
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
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
        </div>

        {/* Create dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Új automatizációs szabály</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mikor és mit csinál ez a szabály..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Trigger (esemény)</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
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
                <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Mégse
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
                Létrehozás
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LicenseGuard>
  );
};

export default Automation;
