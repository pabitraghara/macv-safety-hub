import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";

interface InlineTextEditorProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  textareaClassName?: string;
  inputClassName?: string;
  isTextarea?: boolean;
  minHeight?: string;
}

export function InlineTextEditor({
  value,
  onSave,
  placeholder = "Click to edit...",
  className = "",
  textareaClassName = "",
  inputClassName = "",
  isTextarea = false,
  minHeight = "60px"
}: InlineTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isEditing &&
        editRef.current &&
        !editRef.current.contains(event.target as Node)
      ) {
        handleCancel();
      }
    }

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isEditing]);

  const handleEdit = () => {
    setEditedValue(value);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editedValue.trim() === value.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(editedValue.trim());
      setIsEditing(false);
    } catch {
      setEditedValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div
        ref={editRef}
        className={`relative group cursor-pointer p-4 border border-transparent hover:border-gray-200 rounded-md transition-colors -ml-4 bg-white ${className}`}
      >
        {isTextarea ? (
          <Textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className={`w-full p-0 m-0 border-none outline-none shadow-none resize-none bg-transparent text-gray-700 text-base font-normal whitespace-pre-wrap focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[${minHeight}] ${textareaClassName}`}
            placeholder={placeholder}
            autoFocus
            onKeyDown={handleKeyDown}
          />
        ) : (
          <input
            type="text"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className={`w-full text-2xl sm:text-3xl font-bold border-none outline-none shadow-none bg-transparent text-gray-900 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${inputClassName}`}
            placeholder={placeholder}
            autoFocus
            onKeyDown={handleKeyDown}
          />
        )}
        <div className="absolute bottom-3 right-3 flex gap-4">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative group cursor-pointer p-4 border border-transparent hover:border-gray-200 rounded-md transition-colors -ml-4 ${className}`}
      onClick={handleEdit}
    >
      {isTextarea ? (
        <p className="text-gray-700 whitespace-pre-wrap min-h-[60px]">
          {value || placeholder}
        </p>
      ) : (
        <h1 className="text-2xl sm:text-3xl font-bold">
          {value || placeholder}
        </h1>
      )}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
}
