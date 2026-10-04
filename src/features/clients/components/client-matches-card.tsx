"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type Match = {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  askingRentAmount: number | null;
  askingRentCurrency: string;
  score: number;
  reasons: string[];
};

export function ClientMatchesCard({ clientId, preferences }: { clientId: string; preferences?: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    fetch(`/api/clients/${clientId}/matches?limit=6`)
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((result: { data?: Match[] }) => {
        if (isActive) setMatches(result.data ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [clientId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> Inmuebles recomendados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {preferences && <p className="text-xs text-muted-foreground">{preferences}</p>}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Buscando coincidencias…</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin inmuebles disponibles que coincidan con el perfil.</p>
        ) : (
          matches.map((match) => (
            <Link
              key={match.id}
              href={`/dashboard/inmuebles/${match.id}`}
              className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{match.code} · {match.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{match.address}, {match.city}</p>
                </div>
                {match.askingRentAmount !== null && (
                  <span className="shrink-0 text-sm font-semibold">{formatCurrency(match.askingRentAmount, match.askingRentCurrency)}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.reasons.map((reason) => (
                  <Badge key={reason} variant={reason === "Sobre el presupuesto" ? "destructive" : reason === "Dentro del presupuesto" ? "success" : "secondary"}>
                    {reason}
                  </Badge>
                ))}
                <Badge variant="outline">
                  {[match.bedrooms ? `${match.bedrooms} hab.` : null, match.bathrooms ? `${match.bathrooms} baños` : null, match.parkingSpaces ? `${match.parkingSpaces} puesto(s)` : null]
                    .filter(Boolean)
                    .join(" · ") || match.propertyType}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
