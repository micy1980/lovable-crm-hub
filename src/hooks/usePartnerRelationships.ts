import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface PartnerWithRelationship {
  id: string;
  name: string;
  parent_partner_id: string | null;
  tax_id: string | null;
}

export const usePartnerRelationships = (partnerId: string) => {
  const { activeCompany } = useCompany();

  // Get parent partner
  const { data: parentPartner, isLoading: isLoadingParent } = useQuery({
    queryKey: ['partner-parent', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;

      // First get the current partner to find parent_partner_id
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('parent_partner_id')
        .eq('id', partnerId)
        .single();

      if (partnerError || !partner?.parent_partner_id) return null;

      // Then get the parent partner details
      const { data: parent, error: parentError } = await supabase
        .from('partners')
        .select('id, name, tax_id')
        .eq('id', partner.parent_partner_id)
        .single();

      if (parentError) return null;
      return parent as PartnerWithRelationship;
    },
    enabled: !!partnerId,
  });

  // Get child partners (subsidiaries)
  const { data: childPartners = [], isLoading: isLoadingChildren } = useQuery({
    queryKey: ['partner-children', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from('partners')
        .select('id, name, tax_id, parent_partner_id')
        .eq('parent_partner_id', partnerId)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data as PartnerWithRelationship[];
    },
    enabled: !!partnerId,
  });

  // Get all partners for parent selection (excluding current and its children)
  const { data: availableParents = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['partner-available-parents', partnerId, activeCompany?.id],
    queryFn: async () => {
      if (!partnerId || !activeCompany) return [];

      // Get all partners in the company except the current one and its children
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, tax_id, parent_partner_id')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .neq('id', partnerId)
        .neq('parent_partner_id', partnerId)
        .order('name');

      if (error) throw error;
      return data as PartnerWithRelationship[];
    },
    enabled: !!partnerId && !!activeCompany,
  });

  return {
    parentPartner,
    childPartners,
    availableParents,
    isLoading: isLoadingParent || isLoadingChildren || isLoadingAvailable,
  };
};
