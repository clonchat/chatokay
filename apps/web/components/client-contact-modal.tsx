"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Mail, Phone, User, Building2 } from "lucide-react";

interface ClientContactModalProps {
  userId: Id<"users"> | null;
  userName: string | null | undefined;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientContactModal({
  userId,
  userName,
  userEmail,
  isOpen,
  onClose,
}: ClientContactModalProps) {
  const business = useQuery(
    api.businesses.getBusinessByUserId,
    userId ? { userId } : "skip"
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Datos de contacto - {userName || "Cliente"}</DialogTitle>
          <DialogDescription>
            Información de contacto del cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* User Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
              <User className="h-4 w-4" />
              Información del Usuario
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              {userName && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nombre</p>
                  <p className="text-sm font-medium text-foreground">
                    {userName}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${userEmail}`}
                    className="text-sm text-foreground hover:text-primary hover:underline transition-colors"
                  >
                    {userEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Business Info */}
          {business && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                <Building2 className="h-4 w-4" />
                Información del Negocio
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Nombre del Negocio
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {business.name}
                  </p>
                </div>
                {business.email && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Email del Negocio
                    </p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${business.email}`}
                        className="text-sm text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {business.email}
                      </a>
                    </div>
                  </div>
                )}
                {business.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Teléfono del Negocio
                    </p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${business.phone}`}
                        className="text-sm text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {business.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!business && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              El cliente no tiene un negocio registrado aún.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
