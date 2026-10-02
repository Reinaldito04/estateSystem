"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
  description?: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  onSearch?: (query: string) => SearchableSelectOption[] | Promise<SearchableSelectOption[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  clearable?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
}

const SEPARATOR = "::";
const DEFAULT_MIN_SEARCH_LENGTH = 2;

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function toItemValue(option: SearchableSelectOption) {
  return `${option.label} ${option.keywords ?? ""}${SEPARATOR}${option.value}`;
}

function fromItemValue(itemValue: string) {
  const index = itemValue.lastIndexOf(SEPARATOR);
  return index === -1 ? itemValue : itemValue.slice(index + SEPARATOR.length);
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  onSearch,
  placeholder = "Seleccionar",
  searchPlaceholder = "Buscar…",
  emptyMessage = "Sin resultados",
  loadingMessage = "Buscando…",
  clearable = false,
  clearLabel = "Sin asignar",
  disabled = false,
  id,
  className,
  "aria-invalid": ariaInvalid,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [remoteOptions, setRemoteOptions] = React.useState<SearchableSelectOption[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const listId = React.useId();
  const selected = options.find((option) => option.value === value);
  const minSearchLength = DEFAULT_MIN_SEARCH_LENGTH;
  const trimmed = search.trim();
  const searchEnabled = normalize(trimmed).length >= minSearchLength;

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setRemoteOptions(null);
      setIsSearching(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!onSearch || !open || !searchEnabled) return;
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await onSearch(trimmed);
        if (!cancelled) setRemoteOptions(result);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onSearch, open, searchEnabled, trimmed]);

  const displayOptions = React.useMemo(() => {
    if (!searchEnabled) return options;
    const base = remoteOptions ?? (onSearch ? [] : options);
    if (selected && !base.some((option) => option.value === selected.value)) {
      return [selected, ...base];
    }
    return base;
  }, [searchEnabled, options, remoteOptions, onSearch, selected]);

  const handleSelect = (itemValue: string) => {
    const next = fromItemValue(itemValue);
    onValueChange(next === value ? "" : next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={ariaInvalid || undefined}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            ariaInvalid && "border-destructive focus:ring-destructive",
            className
          )}
        >
          <span className={cn("min-w-0 truncate text-left", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="relative min-w-0 p-0"
        style={{ width: "var(--radix-popover-trigger-width)", minWidth: "12rem" }}
      >
        <Command
          key={open ? "open" : "closed"}
          shouldFilter={searchEnabled}
          filter={(itemValue, searchTerm) => (normalize(itemValue).includes(normalize(searchTerm)) ? 1 : 0)}
        >
          {onSearch && isSearching && (
            <div className="pointer-events-none absolute right-9 top-[18px] -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList id={listId}>
            <CommandEmpty>
              {isSearching ? loadingMessage : searchEnabled ? emptyMessage : `Escribe al menos ${minSearchLength} letras para buscar`}
            </CommandEmpty>
            {clearable && value && (
              <CommandItem
                value={`${clearLabel}${SEPARATOR}__clear__`}
                onSelect={() => {
                  onValueChange("");
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{clearLabel}</span>
              </CommandItem>
            )}
            {displayOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <CommandItem
                  key={option.value}
                  value={toItemValue(option)}
                  onSelect={handleSelect}
                >
                  <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="truncate">{option.label}</p>
                    {option.description && (
                      <p className="truncate text-xs text-muted-foreground">{option.description}</p>
                    )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
