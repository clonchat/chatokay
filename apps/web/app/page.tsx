"use client";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { useAuthNavigation } from "@/hooks/use-auth-navigation";
import { useEffect } from "react";

export default function Page() {
  const { authStatus, redirectToCorrectPage } = useAuthNavigation();

  useEffect(() => {
    // Only redirect if user is authenticated or needs onboarding
    // Don't redirect unauthenticated users - let them see the landing page
    if (authStatus === "authenticated" || authStatus === "onboarding") {
      redirectToCorrectPage();
    }
  }, [authStatus, redirectToCorrectPage]);

  // Show loading state while checking authentication
  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-svh">
        <div className="text-center">
          <h1 className="text-4xl font-bold">ChatOkay</h1>
          <p className="text-muted-foreground mt-2">Cargando...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated or needs onboarding, they'll be redirected
  if (authStatus === "authenticated" || authStatus === "onboarding") {
    return (
      <div className="flex items-center justify-center min-h-svh">
        <div className="text-center">
          <h1 className="text-4xl font-bold">ChatOkay</h1>
          <p className="text-muted-foreground mt-2">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // User is not signed in, show landing page
  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">ChatOkay</h1>
        <p className="text-muted-foreground">Tu asistente de citas con IA</p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/sign-in">Iniciar Sesión</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-up">Registrarse</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
