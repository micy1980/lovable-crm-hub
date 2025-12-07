import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, ArrowUp, ArrowDown, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerRelationships } from '@/hooks/usePartnerRelationships';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';

interface PartnerRelationshipsTabProps {
  partnerId: string;
}

const PartnerRelationshipsTab = ({ partnerId }: PartnerRelationshipsTabProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { parentPartner, childPartners, availableParents, isLoading } = usePartnerRelationships(partnerId);
  const { isReadOnly } = useReadOnlyMode();
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSetParent = async () => {
    if (!selectedParent) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('partners')
        .update({ parent_partner_id: selectedParent })
        .eq('id', partnerId);

      if (error) throw error;

      toast({
        title: 'Siker',
        description: 'Anyavállalat beállítva',
      });
      
      queryClient.invalidateQueries({ queryKey: ['partner-parent', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setSelectedParent('');
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült beállítani az anyavállalatot',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveParent = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('partners')
        .update({ parent_partner_id: null })
        .eq('id', partnerId);

      if (error) throw error;

      toast({
        title: 'Siker',
        description: 'Anyavállalat kapcsolat megszüntetve',
      });
      
      queryClient.invalidateQueries({ queryKey: ['partner-parent', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült megszüntetni a kapcsolatot',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Betöltés...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Parent Partner Section */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUp className="h-4 w-4" />
            Anyavállalat
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {parentPartner ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <button
                onClick={() => navigate(`/partners/${parentPartner.id}`)}
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{parentPartner.name}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={handleRemoveParent}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Nincs anyavállalat beállítva
              </div>
              {!isReadOnly && (
                <div className="flex gap-2">
                  <Select value={selectedParent} onValueChange={setSelectedParent}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Válassz anyavállalatot..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableParents.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          Nincs más partner a cégen belül
                        </div>
                      ) : (
                        availableParents.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partner.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleSetParent} 
                    disabled={!selectedParent || isSaving}
                  >
                    Beállítás
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Child Partners Section */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDown className="h-4 w-4" />
            Leányvállalatok ({childPartners.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {childPartners.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nincsenek leányvállalatok
            </div>
          ) : (
            <div className="space-y-2">
              {childPartners.map((child) => (
                <button
                  key={child.id}
                  onClick={() => navigate(`/partners/${child.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{child.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerRelationshipsTab;
