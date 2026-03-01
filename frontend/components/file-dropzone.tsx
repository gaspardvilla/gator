"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadIcon } from "lucide-react";

const ACCEPT = {
  "image/png": [".png"],
  "video/mp4": [".mp4"],
} as const;

export type FileDropzoneProps = {
  onFileSelected: (file: File | null) => void;
  file: File | null;
  disabled?: boolean;
  className?: string;
};

export function FileDropzone({
  onFileSelected,
  file,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelected(acceptedFiles[0] ?? null);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    disabled,
    onFileDialogCancel: () => onFileSelected(null),
    noClick: disabled,
    noDrag: disabled,
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragActive && "border-primary bg-muted/50",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input {...getInputProps()} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UploadIcon className="size-4" />
          Drop file here
        </CardTitle>
        <CardDescription>
          .png or .mp4 only. Click or drag and drop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {file ? (
          <p className="text-sm font-medium text-foreground">
            {file.name}
            <span className="ml-1 text-muted-foreground">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No file selected
          </p>
        )}
      </CardContent>
    </Card>
  );
}
