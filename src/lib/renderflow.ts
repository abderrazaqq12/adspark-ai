const BASE_URL = import.meta.env.VITE_RENDERFLOW_URL;

export async function createRenderJob(payload: {
  source_url: string;
  output_format: 'mp4';
  resolution: string;
  projectId?: string;
  tool?: string;
}) {
  const res = await fetch(`${BASE_URL}/render/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('RenderFlow job rejected');
  }

  return res.json(); // { id, status }
}

export async function getRenderJob(jobId: string) {
  const res = await fetch(`${BASE_URL}/render/jobs/${jobId}`);

  if (!res.ok) {
    throw new Error('Render job not found');
  }

  return res.json(); // { status, output_path? }
}
