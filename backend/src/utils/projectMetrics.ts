import mongoose, { Types } from 'mongoose';

// Queries collections directly so Project module works before Sprint/Task models exist.

async function collectionExists(name: string): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) return false;
  const found = await db.listCollections({ name }).toArray();
  return found.length > 0;
}

export async function countSprints(projectId: Types.ObjectId): Promise<number> {
  if (!(await collectionExists('sprints'))) return 0;
  return mongoose.connection.db!.collection('sprints').countDocuments({ project: projectId });
}

export interface TaskCounts {
  total: number;
  completed: number;
  timeLogged: number;
}

export async function aggregateTasks(projectId: Types.ObjectId): Promise<TaskCounts> {
  const empty: TaskCounts = { total: 0, completed: 0, timeLogged: 0 };
  if (!(await collectionExists('tasks'))) return empty;

  const [result] = await mongoose.connection
    .db!.collection('tasks')
    .aggregate<TaskCounts>([
      { $match: { project: projectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $in: ['$status', ['done', 'completed']] }, 1, 0] },
          },
          timeLogged: {
            $sum: {
              $reduce: {
                input: { $ifNull: ['$timeLogs', []] },
                initialValue: 0,
                in: { $add: ['$$value', { $ifNull: ['$$this.hours', 0] }] },
              },
            },
          },
        },
      },
    ])
    .toArray();

  return result ?? empty;
}

export async function tasksBySprint(
  sprintIds: Types.ObjectId[],
): Promise<Map<string, { total: number; completed: number }>> {
  const counts = new Map<string, { total: number; completed: number }>();
  if (sprintIds.length === 0 || !(await collectionExists('tasks'))) return counts;

  const rows = await mongoose.connection
    .db!.collection('tasks')
    .aggregate<{ _id: Types.ObjectId; total: number; completed: number }>([
      { $match: { sprint: { $in: sprintIds } } },
      {
        $group: {
          _id: '$sprint',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $in: ['$status', ['done', 'completed']] }, 1, 0] },
          },
        },
      },
    ])
    .toArray();

  for (const row of rows) {
    counts.set(row._id.toString(), { total: row.total, completed: row.completed });
  }
  return counts;
}

export async function countTasksInSprint(sprintId: Types.ObjectId): Promise<number> {
  if (!(await collectionExists('tasks'))) return 0;
  return mongoose.connection.db!.collection('tasks').countDocuments({ sprint: sprintId });
}

export interface ProjectTaskStats {
  total: number;
  completed: number;
}

/** Batch task counts for many projects (used on project list). */
export async function tasksByProject(
  projectIds: Types.ObjectId[],
): Promise<Map<string, ProjectTaskStats>> {
  const counts = new Map<string, ProjectTaskStats>();
  if (projectIds.length === 0 || !(await collectionExists('tasks'))) return counts;

  const rows = await mongoose.connection
    .db!.collection('tasks')
    .aggregate<{ _id: Types.ObjectId; total: number; completed: number }>([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$project',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $in: ['$status', ['done', 'completed']] }, 1, 0] },
          },
        },
      },
    ])
    .toArray();

  for (const row of rows) {
    counts.set(row._id.toString(), { total: row.total, completed: row.completed });
  }
  return counts;
}
