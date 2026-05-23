import api from './axios';
import type { Sprint } from '@/types';

interface Envelope<T> {
  message?: string;
  data: T;
}

// Payload for create/update. sprintNumber is server-assigned.
export interface SprintInput {
  title: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export async function fetchSprints(projectId: string): Promise<Sprint[]> {
  const { data } = await api.get<Envelope<{ sprints: Sprint[] }>>(
    `/projects/${projectId}/sprints`,
  );
  return data.data.sprints;
}

export async function createSprint(projectId: string, input: SprintInput): Promise<Sprint> {
  const { data } = await api.post<Envelope<{ sprint: Sprint }>>(
    `/projects/${projectId}/sprints`,
    input,
  );
  return data.data.sprint;
}

export async function updateSprint(
  projectId: string,
  sprintId: string,
  input: Partial<SprintInput>,
): Promise<Sprint> {
  const { data } = await api.patch<Envelope<{ sprint: Sprint }>>(
    `/projects/${projectId}/sprints/${sprintId}`,
    input,
  );
  return data.data.sprint;
}

// Pass force to delete a sprint that still has tasks.
export async function deleteSprint(
  projectId: string,
  sprintId: string,
  force = false,
): Promise<void> {
  await api.delete(`/projects/${projectId}/sprints/${sprintId}`, {
    params: force ? { force: 'true' } : undefined,
  });
}

export async function reorderSprints(
  projectId: string,
  order: { id: string; order: number }[],
): Promise<Sprint[]> {
  const { data } = await api.patch<Envelope<{ sprints: Sprint[] }>>(
    `/projects/${projectId}/sprints/reorder`,
    { sprints: order },
  );
  return data.data.sprints;
}
