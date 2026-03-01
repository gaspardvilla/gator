"use client";

import { useState } from "react";
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
    onSuccess: (data) => {
      setJobId(data.job_id);
      toast.success("Detection started");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start detection");
    },
  });

  const stream = useDetectStream(jobId);

  const isLoadModelsRunning =
    loadModelsStream.status === "running" ||
    (loadModelsMutation.isPending && loadModelsStream.status !== "error");
  const isRunning =
    stream.status === "running" || (detectMutation.isPending && !stream.errorMessage);
  const canRun = isHealthy && !isRunning && !!selectedFile;

  return (
    <div className="min-h-screen p-6">
      <header className="mx-auto mb-8 max-w-4xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Gatector</h1>
        <p className="mt-2 text-muted-foreground">
          Extract 3D gaze from video or images. Upload a file, run detection, and view the result.
        </p>
      </header>

      <main className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-[1fr_1.2fr]">
        <section className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-center">Model settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field orientation="vertical">
                <FieldLabel>Device</FieldLabel>
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose device">
                      {DEVICE_OPTIONS.find((o) => o.value === device)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose gaze model">
                      {GAZE_MODE_OPTIONS.find((o) => o.value === gazeMode)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GAZE_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button
                className="w-full"
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
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detection</CardTitle>
              <CardDescription>Backend status and run</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    isHealthy ? "bg-green-500" : healthLoading ? "bg-amber-500 animate-pulse" : "bg-red-500"
                  }`}
                  aria-hidden
                />
                <span className="text-sm text-muted-foreground">
                  {healthLoading
                    ? "Checking backend…"
                    : isHealthy
                      ? "Backend ready"
                      : "Backend unavailable"}
                </span>
              </div>

              <Button
                onClick={() => detectMutation.mutate()}
                disabled={!canRun}
                className="w-full"
              >
                {isRunning ? "Running…" : "Run detection"}
              </Button>

              {stream.checkpoints.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Progress</p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
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
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="min-h-[320px]">
            <CardHeader>
              <CardTitle className="text-base">Output</CardTitle>
              <CardDescription>
                Result will appear here after detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Output video or image will be shown here.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
