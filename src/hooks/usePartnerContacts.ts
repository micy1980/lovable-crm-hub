import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';

export interface PartnerContact {
  id: string;
  partner_id: string;
  company_id: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type PartnerContactInput = Omit<PartnerContact, 'id' | 'company_id' | 'created_at' | 'updated_at'>;

export const usePartnerContacts = (partnerId: string) => {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['partner-contacts', partnerId];

  const { data: contacts = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from('partner_contacts')
        .select('*')
        .eq('partner_id', partnerId)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as PartnerContact[];
    },
    enabled: !!partnerId,
  });

  const addContact = useMutation({
    mutationFn: async (input: PartnerContactInput) => {
      if (!activeCompany) throw new Error('No active company');

      const { data, error } = await supabase
        .from('partner_contacts')
        .insert({
          ...input,
          company_id: activeCompany.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PartnerContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'Siker',
        description: 'Kapcsolattartó hozzáadva',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült hozzáadni a kapcsolattartót',
        variant: 'destructive',
      });
      console.error('Add contact error:', error);
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...input }: Partial<PartnerContact> & { id: string }) => {
      const { data, error } = await supabase
        .from('partner_contacts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartnerContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'Siker',
        description: 'Kapcsolattartó módosítva',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült módosítani a kapcsolattartót',
        variant: 'destructive',
      });
      console.error('Update contact error:', error);
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partner_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'Siker',
        description: 'Kapcsolattartó törölve',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült törölni a kapcsolattartót',
        variant: 'destructive',
      });
      console.error('Delete contact error:', error);
    },
  });

  return {
    contacts,
    isLoading,
    error,
    addContact: addContact.mutate,
    updateContact: updateContact.mutate,
    deleteContact: deleteContact.mutate,
    isAdding: addContact.isPending,
    isUpdating: updateContact.isPending,
    isDeleting: deleteContact.isPending,
  };
};
