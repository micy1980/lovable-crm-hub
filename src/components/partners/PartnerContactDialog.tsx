import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { PartnerContact, PartnerContactInput } from '@/hooks/usePartnerContacts';

const formSchema = z.object({
  name: z.string().min(1, 'Kötelező mező'),
  position: z.string().optional(),
  email: z.string().email('Érvénytelen email cím').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
  is_primary: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface PartnerContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: PartnerContact | null;
  partnerId: string;
  onSave: (data: PartnerContactInput) => void;
}

const PartnerContactDialog = ({
  open,
  onOpenChange,
  contact,
  partnerId,
  onSave,
}: PartnerContactDialogProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      position: '',
      email: '',
      phone: '',
      notes: '',
      is_primary: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (contact) {
        form.reset({
          name: contact.name,
          position: contact.position || '',
          email: contact.email || '',
          phone: contact.phone || '',
          notes: contact.notes || '',
          is_primary: contact.is_primary,
        });
      } else {
        form.reset({
          name: '',
          position: '',
          email: '',
          phone: '',
          notes: '',
          is_primary: false,
        });
      }
    }
  }, [open, contact, form]);

  const onSubmit = (values: FormValues) => {
    onSave({
      partner_id: partnerId,
      name: values.name,
      position: values.position || null,
      email: values.email || null,
      phone: values.phone || null,
      notes: values.notes || null,
      is_primary: values.is_primary,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {contact ? 'Kapcsolattartó szerkesztése' : 'Új kapcsolattartó'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Név *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Kapcsolattartó neve" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pozíció</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="pl. Ügyvezető" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+36..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Megjegyzés</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="További információk..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_primary"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Elsődleges kapcsolattartó</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Ez a személy a fő kapcsolattartó
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Mégse
              </Button>
              <Button type="submit">
                {contact ? 'Mentés' : 'Hozzáadás'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerContactDialog;
