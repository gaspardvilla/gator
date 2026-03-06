const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type HealthResponse = { status: string; gator?: string };

export async function healthCheck(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(res.status === 503 ? "Backend not ready" : `Health check failed: ${res.status}`);
  }
  return res.json() as Promise<HealthResponse>;
}

export type UploadResponse = { path: string };

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { detail?: string }).detail ?? `Upload failed: ${res.status}`);
  }
  return res.json() as Promise<UploadResponse>;
}

export type StartDetectResponse = { job_id: string };

export type StartDetectBody = {
  input_path: string;
  modality: string;
  batch_size: number;
  window_stride: number;
  num_workers: number;
};

export async function startDetect(body: StartDetectBody): Promise<StartDetectResponse> {
  const res = await fetch(`${API_BASE}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? `Detect failed: ${res.status}`);
  }
  return res.json() as Promise<StartDetectResponse>;
}

export function streamUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/stream`;
}

export function outputUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/output`;
}

export type LoadModelsResponse = { job_id: string };

export type LoadModelsBody = { device: string; gaze_training_mode: string };

export async function loadModels(body: LoadModelsBody): Promise<LoadModelsResponse> {
  const res = await fetch(`${API_BASE}/load_models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? `Load models failed: ${res.status}`);
  }
  return res.json() as Promise<LoadModelsResponse>;
}
