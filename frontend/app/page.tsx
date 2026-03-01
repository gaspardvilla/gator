"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { healthCheck, startDetect } from "@/lib/backend";
import { useDetectStream } from "@/hooks/useDetectStream";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileDropzone } from "@/components/file-dropzone";
import { toast } from "sonner";

const CHECKPOINT_LABELS: Record<string, string> = {
  input_loaded: "Input loaded",
  heads_detected: "Heads detected & tracked",
  gaze_predicted: "Gaze predicted",
  drawing: "Drawing gaze on output",
};

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { isSuccess: isHealthy, isLoading: healthLoading } = useQuery({
    queryKey: ["health"],
    queryFn: healthCheck,
    refetchInterval: 10_000,
    retry: 2,
  });

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
