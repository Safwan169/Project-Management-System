import mongoose, { Types } from 'mongoose';

// Sprint and Task models don't exist yet, so we query their collections
// directly through the native driver. This keeps the Project module
// working today and correct once those models are added — the collection
// names ('sprints', 'tasks') are mongoose's default pluralization.

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

// Aggregates task totals for a project in a single pass. `timeLogged`
// sums a `timeSpent` field if tasks carry one; otherwise it stays 0.
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
          timeLogged: { $sum: { $ifNull: ['$timeSpent', 0] } },
        },
      },
    ])
    .toArray();

  return result ?? empty;
}
