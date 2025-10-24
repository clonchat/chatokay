"use client";

import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
}

interface DialogFooterProps {
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
};

const DialogContent = ({ className, children }: DialogContentProps) => {
  return (
    <Card
      className={cn(
        "relative z-50 w-full max-w-md bg-card border-border",
        className
      )}
    >
      {children}
    </Card>
  );
};

const DialogHeader = ({ children }: DialogHeaderProps) => {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      {children}
    </CardHeader>
  );
};

const DialogTitle = ({ children }: DialogTitleProps) => {
  return (
    <CardTitle className="text-lg font-semibold text-card-foreground">
      {children}
    </CardTitle>
  );
};

const DialogDescription = ({ children }: DialogDescriptionProps) => {
  return <p className="text-sm text-muted-foreground">{children}</p>;
};

const DialogFooter = ({ children }: DialogFooterProps) => {
  return (
    <CardContent className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-6">
      {children}
    </CardContent>
  );
};

const DialogClose = ({
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
      onClick={onClick}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </Button>
  );
};

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
};
