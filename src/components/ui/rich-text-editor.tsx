"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Image as ImageIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Palette,
  Highlighter,
  RemoveFormatting,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCallback, useEffect, useState } from "react";
import mammoth from "mammoth/mammoth.browser";
import Heading from "@tiptap/extension-heading";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: number;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      // ⚠️ CLAVE: onMouseDown con preventDefault evita que el editor pierda el foco
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 ${isActive ? "bg-accent" : ""}`}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Escribe el contenido del documento...",
  minHeight = 320,
}: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor(
    {
      // ⚠️ CLAVE 1: editable explícito
      editable: true,
      // ⚠️ CLAVE 2: evita problemas de hidratación en Next.js SSR
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          // ⚠️ CLAVE: desactiva heading dentro de StarterKit
          // y regístralo aparte con niveles explícitos
          heading: false,
          // El resto de opciones que ya tenías:
          // (bold, italic, etc. ya vienen activos, no los declares)
        }),
        Heading.configure({
          levels: [1, 2, 3],
        }),
        Underline,
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: false, autolink: true }),
        Placeholder.configure({ placeholder }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
          style: `min-height: ${minHeight}px`,
        },
      },
    },
    // ⚠️ CLAVE 3: array vacío para NO recrear el editor en cada render
    // El `content` inicial solo se usa al montar. Los cambios se propagan vía onUpdate.
    []
  );

  // Sincronizar cambios del prop `content` con el editor (por ejemplo, al abrir otro documento)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (currentHtml !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);

  // ⚠️ CLAVE 4: useEditorState para que el toolbar reaccione a cambios de estado
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) {
        return {
          isBold: false,
          isItalic: false,
          isUnderline: false,
          isStrike: false,
          isCode: false,
          isH1: false,
          isH2: false,
          isH3: false,
          isBulletList: false,
          isOrderedList: false,
          isBlockquote: false,
          isAlignLeft: false,
          isAlignCenter: false,
          isAlignRight: false,
          isAlignJustify: false,
          isHighlight: false,
          isLink: false,
          isRed: false,
          isGreen: false,
          isBlue: false,
          canUndo: false,
          canRedo: false,
        };
      }

      return {
        isBold: editor.isActive("bold"),
        isItalic: editor.isActive("italic"),
        isUnderline: editor.isActive("underline"),
        isStrike: editor.isActive("strike"),
        isCode: editor.isActive("code"),
        isH1: editor.isActive("heading", { level: 1 }),
        isH2: editor.isActive("heading", { level: 2 }),
        isH3: editor.isActive("heading", { level: 3 }),
        isBulletList: editor.isActive("bulletList"),
        isOrderedList: editor.isActive("orderedList"),
        isBlockquote: editor.isActive("blockquote"),
        isAlignLeft: editor.isActive({ textAlign: "left" }),
        isAlignCenter: editor.isActive({ textAlign: "center" }),
        isAlignRight: editor.isActive({ textAlign: "right" }),
        isAlignJustify: editor.isActive({ textAlign: "justify" }),
        isHighlight: editor.isActive("highlight"),
        isLink: editor.isActive("link"),
        isRed: editor.isActive("textStyle", { color: "#ef4444" }),
        isGreen: editor.isActive("textStyle", { color: "#22c55e" }),
        isBlue: editor.isActive("textStyle", { color: "#3b82f6" }),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      };
    },
  });

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          editor.chain().focus().setImage({ src: base64 }).run();
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    },
    [editor]
  );

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", previousUrl ?? "");

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  const handleImportWord = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      setIsUploading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        editor.commands.setContent(result.value);
      } catch (error) {
        console.error("Error importing Word file:", error);
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    },
    [editor]
  );

  if (!editor || !editorState) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/30 p-2">
        {/* === Marcas === */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editorState.isBold}
          title="Negrita"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editorState.isItalic}
          title="Cursiva"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editorState.isUnderline}
          title="Subrayado"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editorState.isStrike}
          title="Tachado"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editorState.isCode}
          title="Código"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* === Encabezados === */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editorState.isH1}
          title="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editorState.isH2}
          title="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editorState.isH3}
          title="Título 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* === Listas === */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editorState.isBulletList}
          title="Lista con viñetas"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editorState.isOrderedList}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editorState.isBlockquote}
          title="Cita"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* === Alineación === */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editorState.isAlignLeft}
          title="Alinear izquierda"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editorState.isAlignCenter}
          title="Centrar"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editorState.isAlignRight}
          title="Alinear derecha"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editorState.isAlignJustify}
          title="Justificar"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* === Color / Resaltado === */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editorState.isHighlight}
          title="Resaltar"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setColor("#ef4444").run()}
          isActive={editorState.isRed}
          title="Color rojo"
        >
          <Palette className="h-4 w-4 text-red-500" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setColor("#22c55e").run()}
          isActive={editorState.isGreen}
          title="Color verde"
        >
          <Palette className="h-4 w-4 text-green-500" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setColor("#3b82f6").run()}
          isActive={editorState.isBlue}
          title="Color azul"
        >
          <Palette className="h-4 w-4 text-blue-500" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* === Enlaces y utilidades === */}
        <ToolbarButton
          onClick={addLink}
          isActive={editorState.isLink}
          title="Insertar enlace"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Línea horizontal"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
          title="Limpiar formato"
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* === Historial === */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editorState.canUndo}
          title="Deshacer"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editorState.canRedo}
          title="Rehacer"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* === Imagen === */}
        <label className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isUploading}
            title="Insertar imagen"
            className="h-8 w-8"
            asChild={false}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </label>

        {/* === Importar Word === */}
        <label className="relative">
          <input
            type="file"
            accept=".docx"
            onChange={handleImportWord}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isUploading}
            title="Importar Word"
            className="h-8 w-8"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </label>
      </div>

      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}