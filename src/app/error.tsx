"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Algo salió mal</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Ocurrió un error inesperado al cargar esta sección. Puedes intentarlo de nuevo.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <a href="/dashboard">
            <Home className="h-4 w-4" aria-hidden="true" />
            Ir al panel
          </a>
        </Button>
      </div>
    </div>
  );
}
