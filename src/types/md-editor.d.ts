declare module "@uiw/react-md-editor" {
  import * as React from "react";

  export interface MDEditorProps {
    value: string;
    onChange?: (value: string | undefined) => void;
    height?: number;
    preview?: "edit" | "live" | "preview";
    textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
    className?: string;
  }

  const MDEditor: React.FC<MDEditorProps>;
  export default MDEditor;
}
