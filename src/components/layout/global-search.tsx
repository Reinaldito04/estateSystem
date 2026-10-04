"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, User, Users, FileText, DollarSign, Wrench, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "property" | "owner" | "client" | "lease" | "transaction" | "issue";
  title: string;
  subtitle: string;
  href: string;
}

const typeConfig = {
  property: { icon: Building2, label: "Inmueble", color: "text-violet-600 bg-violet-500/10" },
  owner: { icon: Users, label: "Propietario", color: "text-blue-600 bg-blue-500/10" },
  client: { icon: User, label: "Cliente", color: "text-emerald-600 bg-emerald-500/10" },
  lease: { icon: FileText, label: "Contrato", color: "text-amber-600 bg-amber-500/10" },
  transaction: { icon: DollarSign, label: "Transacción", color: "text-emerald-600 bg-emerald-500/10" },
  issue: { icon: Wrench, label: "Avería", color: "text-red-600 bg-red-500/10" },
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    try {
      const endpoints = [
        { url: `/api/properties?search=${encodeURIComponent(searchQuery)}&limit=3`, type: "property" as const },
        { url: `/api/owners?search=${encodeURIComponent(searchQuery)}&limit=3`, type: "owner" as const },
        { url: `/api/clients?search=${encodeURIComponent(searchQuery)}&limit=4`, type: "client" as const },
        { url: `/api/leases?search=${encodeURIComponent(searchQuery)}&limit=3`, type: "lease" as const },
        { url: `/api/transactions?search=${encodeURIComponent(searchQuery)}&limit=3`, type: "transaction" as const },
        { url: `/api/issues?search=${encodeURIComponent(searchQuery)}&limit=3`, type: "issue" as const },
      ];

      const responses = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const res = await fetch(endpoint.url, { signal: controller.signal });
            if (!res.ok) return [];
            const data = await res.json();
            return (data.data as Record<string, unknown>[])
              .filter((item) => endpoint.type !== "client" || item.role !== "OWNER")
              .map((item) => ({
                id: item.id as string,
                type: endpoint.type,
                title: getTitle(endpoint.type, item),
                subtitle: getSubtitle(endpoint.type, item),
                href: getHref(endpoint.type, item),
              }));
          } catch {
            return [];
          }
        })
      );

      if (requestId !== requestIdRef.current || controller.signal.aborted) return;

      const allResults = responses.flat();
      setResults(allResults);
      setSelectedIndex(-1);
    } catch {
      if (requestId === requestIdRef.current) setResults([]);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, performSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      if (e.key === "ArrowDown" && isOpen) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      }
      if (e.key === "ArrowUp" && isOpen) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
      if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        router.push(results[selectedIndex].href);
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 transition-all duration-200 focus-within:border-primary/40 focus-within:bg-background focus-within:shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar clientes, propietarios, inmuebles..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="h-9 w-[min(24rem,35vw)] bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          aria-label="Búsqueda global"
        />
        <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-border/60 bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-elevated animate-scale-in">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No se encontraron resultados</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="max-h-[24rem] overflow-y-auto p-1.5">
              {results.map((result, index) => {
                const config = typeConfig[result.type];
                const Icon = config.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                      index === selectedIndex ? "bg-accent" : "hover:bg-muted/50"
                    )}
                  >
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.color)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{result.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getTitle(type: SearchResult["type"], item: Record<string, unknown>): string {
  switch (type) {
    case "property":
      return `${item.code} - ${item.title}`;
    case "owner":
    case "client":
      return item.fullName as string;
    case "lease":
      return `Contrato ${item.contractNumber}`;
    case "transaction":
      return (item.description as string) || `Transacción ${item.referenceNumber}`;
    case "issue":
      return `${item.issueType} - ${item.description?.toString().slice(0, 40)}...`;
    default:
      return "Sin título";
  }
}

function getSubtitle(type: SearchResult["type"], item: Record<string, unknown>): string {
  switch (type) {
    case "property":
      return `${item.address}, ${item.city}`;
    case "owner":
    case "client":
      return (item.legalDocumentId as string) || (item.email as string) || "";
    case "lease": {
      const prop = item.property as Record<string, unknown> | undefined;
      return `${prop?.code ?? ""} - ${prop?.title ?? ""}`;
    }
    case "transaction":
      return `${item.category} - ${item.amount}`;
    case "issue": {
      const prop = item.property as Record<string, unknown> | undefined;
      return `${prop?.code ?? ""} - ${item.status ?? ""}`;
    }
    default:
      return "";
  }
}

function getHref(type: SearchResult["type"], item: Record<string, unknown>): string {
  switch (type) {
    case "property":
      return `/dashboard/inmuebles/${item.id}`;
    case "owner":
      return `/dashboard/propietarios/${item.id}`;
    case "client":
      return `/dashboard/clientes/${item.id}`;
    case "lease":
      return `/dashboard/contratos/${item.id}`;
    case "transaction":
      return `/dashboard/transacciones`;
    case "issue":
      return `/dashboard/averias/${item.id}`;
    default:
      return "/dashboard";
  }
}
