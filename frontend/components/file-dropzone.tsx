"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fontSizes, radius, spacing, borderWidth } from "@/lib/sizes";
import { CheckIcon, UploadIcon } from "lucide-react";

const ACCEPT = {
  "image/png": [".png"],
  "video/mp4": [".mp4"],
} as const;

export type FileDropzoneProps = {
  onFileSelected: (file: File | null) => void;
  file: File | null;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  footer?: React.ReactNode;
};

export function FileDropzone({
  onFileSelected,
  file,
  disabled = false,
  className,
  style,
  footer,
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
      className={cn(className)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing[4],
        paddingLeft: spacing[4],
        paddingRight: spacing[4],
        paddingTop: spacing[4],
        paddingBottom: spacing[4],
        ...style,
      }}
    >
      <Card
        {...getRootProps()}
        className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: isDragActive ? "color-mix(in oklch, var(--muted) 50%, transparent)" : "transparent",
          borderWidth: borderWidth.thin,
          borderStyle: file ? "solid" : "dashed",
          borderColor: "var(--muted-foreground)",
          borderRadius: radius.inner,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          outline: "none",
          transition: "border-color 0.2s, background-color 0.2s, box-shadow 0.2s",
        }}
      >
        <input {...getInputProps()} />
        <CardHeader
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            minHeight: 0,
          }}
        >
          <CardTitle
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              fontSize: fontSizes.base,
              lineHeight: "1",
              fontWeight: 600,
            }}
          >
            {file ? <CheckIcon className="size-4" /> : <UploadIcon className="size-4" />}
            {file ? "File selected" : "Drop file here"}
          </CardTitle>
          <CardDescription
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: fontSizes.sm,
              color: "var(--muted-foreground)",
            }}
          >
            {file
              ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)`
              : ".png or .mp4 file"}
          </CardDescription>
        </CardHeader>
      </Card>
      {footer != null ? (
        <CardFooter
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing[4],
            paddingTop: 0,
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
