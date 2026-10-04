"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getApiError } from "@/lib/api-error";
import { csvToObjects, downloadCsv, toCsv } from "@/lib/csv";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";

type ImportType = "clients" | "owners" | "properties";

const IMPORT_TYPES: { value: ImportType; label: string; description: string }[] = [
  { value: "clients", label: "Clientes", description: "Inquilinos, compradores, prospectos y fiadores" },
  { value: "owners", label: "Propietarios", description: "Cartera de propietarios" },
  { value: "properties", label: "Inmuebles", description: "Requiere el documento del propietario" },
];

const TEMPLATES: Record<ImportType, { headers: string[]; example: string[]; filename: string }> = {
  clients: {
    headers: ["fullName", "legalDocumentId", "phone", "email", "city", "address", "role", "maxBudget", "preferredPropertyType", "housingRequirement"],
    example: ["Ana Pérez", "V-12345678", "555-0101", "ana@example.com", "Caracas", "Av. Principal 123", "TENANT", "800", "APARTMENT", "2 habitaciones"],
    filename: "plantilla-clientes.csv",
  },
  owners: {
    headers: ["fullName", "legalDocumentId", "phone", "email", "city", "address"],
    example: ["Luis Gómez", "V-87654321", "555-0202", "luis@example.com", "Caracas", "Calle 5, Res. Sol"],
    filename: "plantilla-propietarios.csv",
  },
  properties: {
    headers: ["code", "title", "address", "city", "ownerDocumentId", "propertyType", "bedrooms", "bathrooms", "parkingSpaces", "totalAreaSqm", "askingRentAmount", "askingRentCurrency"],
    example: ["PROP-1001", "Apartamento 3 habitaciones", "Av. Libertador 456", "Caracas", "V-87654321", "APARTMENT", "3", "2", "1", "95", "750", "USD"],
    filename: "plantilla-inmuebles.csv",
  },
};

type ImportResult = {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export default function ImportPage() {
  const [type, setType] = useState<ImportType>("clients");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fieldError, setFieldError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const headers = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  const handleDownloadTemplate = () => {
    const template = TEMPLATES[type];
    downloadCsv(template.filename, toCsv([template.headers, template.example]));
  };

  const handleFile = async (file: File | null) => {
    setResult(null);
    setFieldError("");
    if (!file) {
      setRows([]);
      setFileName("");
      return;
    }
    try {
      const text = await file.text();
      const parsed = csvToObjects(text);
      if (parsed.length === 0) {
        setFieldError("El archivo no contiene filas de datos.");
        setRows([]);
        setFileName(file.name);
        return;
      }
      setRows(parsed);
      setFileName(file.name);
    } catch {
      setFieldError("No se pudo leer el archivo.");
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) {
      setFieldError("Selecciona un archivo con datos.");
      return;
    }
    setIsImporting(true);
    setFieldError("");
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, rows }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast({ title: "Error", description: getApiError(payload, "No se pudo importar").message, variant: "destructive" });
        return;
      }
      const summary = payload as ImportResult;
      setResult(summary);
      toast({
        title: "Importación finalizada",
        description: `${summary.created} creados · ${summary.skipped} omitidos · ${summary.errors.length} con error`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar datos</h1>
        <p className="mt-1 text-muted-foreground">Carga masiva desde CSV para clientes, propietarios e inmuebles</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {IMPORT_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setType(option.value);
              setRows([]);
              setFileName("");
              setResult(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className={`rounded-xl border p-4 text-left transition-colors ${
              type === option.value ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
            }`}
          >
            <p className="font-medium">{option.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4" /> Archivo CSV
          </CardTitle>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4" /> Plantilla
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
          />
          {fieldError && <p className="text-sm font-medium text-destructive">{fieldError}</p>}
          {fileName && (
            <p className="text-sm text-muted-foreground">
              {fileName} · {rows.length} fila(s) detectada(s)
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" disabled={isImporting || rows.length === 0} className="gap-2" onClick={handleImport}>
              <Upload className="h-4 w-4" /> {isImporting ? "Importando…" : `Importar ${rows.length || ""}`}
            </Button>
            {rows.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => { setRows([]); setFileName(""); setResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {result.errors.length === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
              Resultado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{result.created} creados</Badge>
              <Badge variant="secondary">{result.skipped} omitidos</Badge>
              <Badge variant={result.errors.length > 0 ? "destructive" : "outline"}>{result.errors.length} con error</Badge>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border p-3">
                {result.errors.map((error, index) => (
                  <p key={`${error.row}-${index}`} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Fila {error.row}:</span> {error.message}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa ({Math.min(rows.length, 10)} de {rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {headers.map((header) => (
                      <th key={header} className="whitespace-nowrap px-2 py-2 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-b last:border-0">
                      {headers.map((header) => (
                        <td key={header} className="whitespace-nowrap px-2 py-1.5">{row[header]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
