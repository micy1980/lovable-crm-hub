import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Star, Mail, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePartnerContacts, PartnerContact, PartnerContactInput } from '@/hooks/usePartnerContacts';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import PartnerContactDialog from './PartnerContactDialog';

interface PartnerContactsTabProps {
  partnerId: string;
}

const PartnerContactsTab = ({ partnerId }: PartnerContactsTabProps) => {
  const { t } = useTranslation();
  const { contacts, isLoading, addContact, updateContact, deleteContact } = usePartnerContacts(partnerId);
  const { isReadOnly } = useReadOnlyMode();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<PartnerContact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  const handleEdit = (contact: PartnerContact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleSave = (data: PartnerContactInput) => {
    if (editingContact) {
      updateContact({ id: editingContact.id, ...data });
    } else {
      addContact(data);
    }
    setDialogOpen(false);
    setEditingContact(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteContact(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Betöltés...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Kapcsolattartók ({contacts.length})</h3>
        {!isReadOnly && (
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Új kapcsolattartó
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          Nincsenek kapcsolattartók
        </div>
      ) : (
        <div className="grid gap-3">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{contact.name}</span>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Elsődleges
                        </Badge>
                      )}
                    </div>
                    {contact.position && (
                      <div className="text-sm text-muted-foreground pl-6">
                        {contact.position}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm pl-6">
                      {contact.email && (
                        <a 
                          href={`mailto:${contact.email}`} 
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a 
                          href={`tel:${contact.phone}`} 
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                    {contact.notes && (
                      <div className="text-sm text-muted-foreground pl-6 pt-1">
                        {contact.notes}
                      </div>
                    )}
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PartnerContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        partnerId={partnerId}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kapcsolattartó törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretnéd ezt a kapcsolattartót? Ez a művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartnerContactsTab;
