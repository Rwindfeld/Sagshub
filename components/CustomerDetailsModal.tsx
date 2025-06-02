import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Customer } from '../shared/types';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerDetailsModal({
  customer,
  isOpen,
  onClose,
}: CustomerDetailsModalProps) {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kundedetaljer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Navn</h3>
            <p>{customer.name}</p>
          </div>
          <div>
            <h3 className="font-semibold">Email</h3>
            <p>{customer.email}</p>
          </div>
          <div>
            <h3 className="font-semibold">Telefon</h3>
            <p>{customer.phone}</p>
          </div>
          <div>
            <h3 className="font-semibold">Adresse</h3>
            <p>{customer.address}</p>
          </div>
          {customer.company && (
            <div>
              <h3 className="font-semibold">Virksomhed</h3>
              <p>{customer.company}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 