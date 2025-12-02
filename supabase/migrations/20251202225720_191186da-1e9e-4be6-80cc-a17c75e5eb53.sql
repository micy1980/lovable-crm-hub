-- Drop the existing check constraint
ALTER TABLE public.partner_addresses DROP CONSTRAINT partner_addresses_address_type_check;

-- Add new check constraint that includes 'mailing'
ALTER TABLE public.partner_addresses ADD CONSTRAINT partner_addresses_address_type_check 
CHECK (address_type = ANY (ARRAY['headquarters'::text, 'site'::text, 'mailing'::text]));