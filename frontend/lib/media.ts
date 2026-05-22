// Backend stores only the filename for thumbnails; build the full URL.
// The /uploads route is served from the API origin, not /api.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  '',
);

export function thumbnailUrl(filename?: string): string | null {
  if (!filename) return null;
  return `${API_ORIGIN}/uploads/thumbnails/${filename}`;
}
