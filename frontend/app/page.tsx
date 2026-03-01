"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { healthCheck, loadModels, startDetect, uploadFile } from "@/lib/backend";
import { useDetectStream } from "@/hooks/useDetectStream";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/file-dropzone";
import { containerMaxWidth, fontSizes, spacing } from "@/lib/sizes";
import { toast } from "sonner";

const DEVICE_OPTIONS = [
  { value: "cpu", label: "CPU", description: "Run on CPU" },
  { value: "cuda", label: "GPU (cuda)", description: "Run on NVIDIA GPU via CUDA" },
  { value: "mps", label: "GPU (mps)", description: "Run on Apple Silicon GPU via MPS" },
] as const;

const GAZE_MODE_OPTIONS = [
  {
    value: "GazeFollow360",
    label: "GazeFollow360",
    description: "Best SOTA model trained on Gaze360 and GazeFollow",
  },
  {
    value: "Gaze360",
    label: "Gaze360",
    description: "Best model trained on Gaze360 only",
  },
] as const;

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [loadModelsJobId, setLoadModelsJobId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [device, setDevice] = useState<string>("cpu");
  const [gazeMode, setGazeMode] = useState<string>("GazeFollow360");

  const { isSuccess: isHealthy, isLoading: healthLoading } = useQuery({
    queryKey: ["health"],
    queryFn: healthCheck,
    refetchInterval: 10_000,
    retry: 2,
  });

  const loadModelsMutation = useMutation({
    mutationFn: (body: { device: string; gaze_training_mode: string }) => loadModels(body),
    onSuccess: (data) => setLoadModelsJobId(data.job_id),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start load models");
    },
  });

  const loadModelsStream = useDetectStream(loadModelsJobId);

  const detectMutation = useMutation({
    mutationFn: async (file: File) => {
      const { path } = await uploadFile(file);
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      const modality = "image";
      // const modality = ext === ".mp4" ? "video" : "image";
      return startDetect({ input_path: path, modality });
    },
    onSuccess: (data) => setJobId(data.job_id),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start detection");
    },
  });

  const stream = useDetectStream(jobId);

  const LOAD_MODELS_TOAST_ID = "load-models-progress";
  useEffect(() => {
    if (loadModelsStream.status === "running") {
      const label =
        loadModelsStream.checkpoints.length > 0
          ? loadModelsStream.checkpoints[loadModelsStream.checkpoints.length - 1]
          : "Loading models…";
      toast.loading(label, { id: LOAD_MODELS_TOAST_ID });
    } else if (loadModelsStream.status === "done") {
      toast.success("Models loaded", { id: LOAD_MODELS_TOAST_ID });
    } else if (loadModelsStream.status === "error" && loadModelsStream.errorMessage) {
      toast.error(loadModelsStream.errorMessage, { id: LOAD_MODELS_TOAST_ID });
    }
  }, [loadModelsStream.status, loadModelsStream.checkpoints, loadModelsStream.errorMessage]);

  const DETECT_TOAST_ID = "detect-progress";
  useEffect(() => {
    if (stream.status === "running") {
      const label =
        stream.checkpoints.length > 0
          ? stream.checkpoints[stream.checkpoints.length - 1]
          : "Running…";
      toast.loading(label, { id: DETECT_TOAST_ID });
    } else if (stream.status === "done") {
      toast.success("Detection completed", { id: DETECT_TOAST_ID });
    } else if (stream.status === "error" && stream.errorMessage) {
      toast.error(stream.errorMessage, { id: DETECT_TOAST_ID });
    }
  }, [stream.status, stream.checkpoints, stream.errorMessage]);

  const isLoadModelsRunning =
    loadModelsStream.status === "running" ||
    (loadModelsMutation.isPending && loadModelsStream.status !== "error");
  const isRunning =
    stream.status === "running" || (detectMutation.isPending && !stream.errorMessage);
  const canRun = isHealthy && !isRunning && !!selectedFile;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: spacing[6],
      }}
    >
      <header
        style={{
          margin: `0 auto ${spacing[8]}`,
          maxWidth: containerMaxWidth,
          textAlign: "center",
        }}
      >
        <h1
        style={{
          fontSize: fontSizes.xl,
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
        }}
        >
          Gatector
        </h1>
        <p
        style={{
          marginTop: spacing[2],
          color: "var(--muted-foreground)",
          fontSize: fontSizes.sm,
        }}
        >
          Extract 3D gaze from video or images. Upload a file, run detection, and view the result.
        </p>
      </header>

      <main
        className="grid-cols-1 md:grid-cols-[1fr_1.2fr]"
        style={{
          margin: "0 auto",
          display: "grid",
          width: "100%",
          maxWidth: containerMaxWidth,
          gap: spacing[6],
        }}
      >
        <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: spacing[4],
        }}
        >
          <Card>
            <CardHeader>
              <CardTitle
                style={{
                  fontSize: fontSizes.lg,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Model settings
              </CardTitle>
            </CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
              <Field orientation="vertical">
                <FieldLabel>Device</FieldLabel>
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger style={{ width: "100%" }}>
                    <SelectValue placeholder="Choose device">
                      {DEVICE_OPTIONS.find((o) => o.value === device)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: spacing[0.5],
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{opt.label}</span>
                          <span
                            style={{
                              fontSize: fontSizes.xs,
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field orientation="vertical">
                <FieldLabel>Gaze model training mode</FieldLabel>
                <Select value={gazeMode} onValueChange={setGazeMode}>
                  <SelectTrigger style={{ width: "100%" }}>
                    <SelectValue placeholder="Choose gaze model">
                      {GAZE_MODE_OPTIONS.find((o) => o.value === gazeMode)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GAZE_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: spacing[0.5],
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{opt.label}</span>
                          <span
                            style={{
                              fontSize: fontSizes.xs,
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button
                style={{ width: "100%" }}
                onClick={() =>
                  loadModelsMutation.mutate({
                    device,
                    gaze_training_mode: gazeMode,
                  })
                }
                disabled={isLoadModelsRunning}
              >
                {isLoadModelsRunning ? "Loading…" : "Load models"}
              </Button>
            </CardContent>
          </Card>
          <FileDropzone
            file={selectedFile}
            onFileSelected={setSelectedFile}
            disabled={isRunning}
            footer={
              <>
                <Button
                  onClick={() => selectedFile && detectMutation.mutate(selectedFile)}
                  disabled={!canRun}
                  style={{ width: "100%" }}
                >
                  {isRunning ? "Running…" : "Run detection"}
                </Button>
              </>
            }
          />
        </section>

        <section>
          <Card style={{ minHeight: "320px" }}>
            <CardHeader>
              <CardTitle style={{ fontSize: fontSizes.base, fontWeight: 600 }}>
                Output
              </CardTitle>
              <CardDescription
                style={{
                  fontSize: fontSizes.sm,
                  color: "var(--muted-foreground)",
                }}
              >
                Result will appear here after detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                style={{
                  fontSize: fontSizes.sm,
                  color: "var(--muted-foreground)",
                }}
              >
                Output video or image will be shown here.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
