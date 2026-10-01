"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag as TagIcon, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type TagRecord = { id: string; name: string; color: string };

export function PropertyTagsEditor({
  propertyId,
  initialTags,
}: {
  propertyId: string;
  initialTags: TagRecord[];
}) {
  const [allTags, setAllTags] = useState<TagRecord[]>([]);
  const [selected, setSelected] = useState<string[]>(initialTags.map((tag) => tag.id));
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#2563eb");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) setAllTags((await response.json()).data);
    } catch {
      console.error("Error fetching tags");
    }
  };

  useEffect(() => {
    let isCurrent = true;
    fetch("/api/tags")
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((result) => {
        if (isCurrent) setAllTags(result.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  const createTag = async () => {
    if (!newName.trim()) return;
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (response.ok) {
      const tag = await response.json();
      await fetchTags();
      setSelected((current) => [...current, tag.id]);
      setNewName("");
    }
  };

  const toggle = (tagId: string) => {
    setSelected((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: selected }),
      });
      if (response.ok) {
        toast({ title: "Etiquetas guardadas", description: "Las etiquetas del inmueble se actualizaron" });
        fetchTags();
      } else {
        toast({ title: "Error", description: "No se pudieron guardar las etiquetas", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TagIcon className="h-4 w-4" /> Etiquetas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay etiquetas creadas.</p>
          ) : (
            allTags.map((tag) => {
              const isSelected = selected.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: isSelected ? tag.color : "transparent",
                    borderColor: tag.color,
                    color: isSelected ? "#ffffff" : tag.color,
                  }}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {tag.name}
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nueva etiqueta"
            className="max-w-48"
          />
          <input
            type="color"
            value={newColor}
            onChange={(event) => setNewColor(event.target.value)}
            className="h-10 w-12 cursor-pointer rounded-md border"
            aria-label="Color de la etiqueta"
          />
          <Button type="button" variant="outline" size="sm" onClick={createTag}>
            <Plus className="mr-1 h-4 w-4" /> Crear
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar etiquetas"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
