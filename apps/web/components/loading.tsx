"use client";

import { cn } from "@workspace/ui/lib/utils";
import { VariantProps, cva } from "class-variance-authority";

const loadingVariants = cva("flex items-center justify-center", {
  variants: {
    variant: {
      fullscreen: "min-h-screen",
      page: "min-h-[calc(100vh-80px)]",
      inline: "py-8",
      spinner: "",
    },
    size: {
      sm: "",
      default: "",
      lg: "",
    },
  },
  defaultVariants: {
    variant: "page",
    size: "default",
  },
});

const spinnerVariants = cva("rounded-full", {
  variants: {
    size: {
      sm: "h-6 w-6 border-2",
      default: "h-10 w-10 border-[3px]",
      lg: "h-14 w-14 border-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface LoadingProps extends VariantProps<typeof loadingVariants> {
  message?: string;
  className?: string;
  spinnerClassName?: string;
  showSpinner?: boolean;
}

export function Loading({
  variant,
  size,
  message,
  className,
  spinnerClassName,
  showSpinner = true,
}: LoadingProps) {
  return (
    <div
      className={cn(
        loadingVariants({ variant, size }),
        "bg-background",
        className
      )}
    >
      <div className="text-center space-y-4">
        {showSpinner && (
          <div className="relative mx-auto inline-block">
            {/* Spinner circular animado */}
            <div
              className={cn(
                spinnerVariants({ size }),
                "border-solid border-primary/20 border-t-primary",
                "animate-spin",
                spinnerClassName
              )}
              role="status"
              aria-label="Cargando"
            >
              <span className="sr-only">Cargando...</span>
            </div>
          </div>
        )}
        {message && (
          <p
            className={cn(
              "text-muted-foreground",
              size === "sm" && "text-sm",
              size === "default" && "text-base",
              size === "lg" && "text-lg"
            )}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// Componente específico para pantalla completa (LoadingScreen)
export function LoadingScreen({
  message = "Cargando...",
  ...props
}: Omit<LoadingProps, "variant">) {
  return <Loading {...props} variant="fullscreen" message={message} />;
}

// Componente para loading inline en componentes
export function LoadingInline({
  message,
  ...props
}: Omit<LoadingProps, "variant">) {
  return <Loading {...props} variant="inline" message={message} />;
}

// Spinner simple sin contenedor
export function Spinner({
  size = "default",
  className,
  spinnerClassName,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
  spinnerClassName?: string;
}) {
  return (
    <div className={cn(loadingVariants({ variant: "spinner" }), className)}>
      <div className="relative inline-block">
        <div
          className={cn(
            spinnerVariants({ size }),
            "border-solid border-primary/20 border-t-primary",
            "animate-spin",
            spinnerClassName
          )}
          role="status"
          aria-label="Cargando"
        />
      </div>
    </div>
  );
}
