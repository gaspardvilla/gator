"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { healthCheck, loadModels, startDetect } from "@/lib/backend";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileDropzone } from "@/components/file-dropzone";
import { toast } from "sonner";

const CHECKPOINT_LABELS: Record<string, string> = {
  input_loaded: "Input loaded",
  heads_detected: "Heads detected & tracked",
  gaze_predicted: "Gaze predicted",
  drawing: "Drawing gaze on output",
};

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
    onSuccess: (data) => {
      setLoadModelsJobId(data.job_id);
      toast.success("Loading models…");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start load models");
    },
  });

  const loadModelsStream = useDetectStream(loadModelsJobId);

  const detectMutation = useMutation({
    mutationFn: startDetect,
    onSuccess: (data) => setJobId(data.job_id),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start detection");
    },
  });

  const stream = useDetectStream(jobId);

  const DETECT_TOAST_ID = "detect-progress";
  useEffect(() => {
    if (stream.status === "running") {
      const label =
        stream.checkpoints.length > 0
          ? CHECKPOINT_LABELS[stream.checkpoints[stream.checkpoints.length - 1]] ??
            stream.checkpoints[stream.checkpoints.length - 1]
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
        padding: "1.5rem",
      }}
    >
      <header
        style={{
          margin: "0 auto 2rem",
          maxWidth: "56rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.875rem",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
          }}
        >
          Gatector
        </h1>
        <p
          style={{
            marginTop: "0.5rem",
            color: "var(--muted-foreground)",
            fontSize: "0.875rem",
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
          maxWidth: "56rem",
          gap: "1.5rem",
        }}
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Model settings
              </CardTitle>
            </CardHeader>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                            gap: "0.125rem",
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{opt.label}</span>
                          <span
                            style={{
                              fontSize: "0.75rem",
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
                            gap: "0.125rem",
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{opt.label}</span>
                          <span
                            style={{
                              fontSize: "0.75rem",
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
                  onClick={() => detectMutation.mutate()}
                  disabled={!canRun}
                  style={{ width: "100%" }}
                >
                  {isRunning ? "Running…" : "Run detection"}
                </Button>
                {stream.checkpoints.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      Progress
                    </p>
                    <ul
                      style={{
                        listStylePosition: "inside",
                        listStyleType: "disc",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        fontSize: "0.875rem",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {stream.checkpoints.map((cp, i) => (
                        <li key={`${cp}-${i}`}>
                          {CHECKPOINT_LABELS[cp] ?? cp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {stream.status === "done" && stream.outputDir && (
                  <Alert>
                    <AlertTitle>Done</AlertTitle>
                    <AlertDescription>
                      Output saved to {stream.outputDir}
                    </AlertDescription>
                  </Alert>
                )}
                {stream.status === "error" && stream.errorMessage && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{stream.errorMessage}</AlertDescription>
                  </Alert>
                )}
              </>
            }
          />
        </section>

        <section>
          <Card style={{ minHeight: "320px" }}>
            <CardHeader>
              <CardTitle style={{ fontSize: "1rem", fontWeight: 600 }}>
                Output
              </CardTitle>
              <CardDescription
                style={{
                  fontSize: "0.875rem",
                  color: "var(--muted-foreground)",
                }}
              >
                Result will appear here after detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                style={{
                  fontSize: "0.875rem",
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
