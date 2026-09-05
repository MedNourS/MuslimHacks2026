import { useEffect, useState, type FormEvent } from "react";
import { timelineApi } from "../../lib/api";
import type { TimelinePost } from "../../lib/timeline";
import { formatRelativeTime } from "../../lib/time";
import { getSessionUser } from "../../lib/session";
import { Button } from "../shared/Button";

export interface TimelineFeedProps {
  elderId: string;
}

export function TimelineFeed({ elderId }: TimelineFeedProps) {
  const user = getSessionUser();
  const [posts, setPosts] = useState<TimelinePost[] | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    timelineApi
      .list<TimelinePost[]>(elderId)
      .then(setPosts)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load the timeline."));
  }, [elderId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const post = await timelineApi.create<TimelinePost>(elderId, { body: body.trim() });
      setPosts((prev) => [post, ...(prev ?? [])]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-sm font-bold text-ink-900">Timeline</h2>

      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share an update — a visit, a doctor's note, how today went…"
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg border-1.5 border-black/10 px-3.5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-sage-500 focus:ring-3 focus:ring-sage-100"
        />
        {error && <p className="mt-1.5 text-xs font-medium text-danger-600">{error}</p>}
        <div className="mt-2.5 flex justify-end">
          <Button type="submit" isLoading={submitting} disabled={!body.trim()}>
            Post update
          </Button>
        </div>
      </form>

      {loadError && <p className="mt-3 text-sm font-medium text-danger-600">{loadError}</p>}

      {posts && posts.length === 0 && <p className="mt-2 text-sm text-ink-500">No updates yet — be the first to post one.</p>}

      {posts && posts.length > 0 && (
        <ul className="mt-5 space-y-4 border-t border-black/5 pt-5">
          {posts.map((post) => (
            <li key={post.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-ink-900">
                  {post.author.id === user?.id ? "You" : post.author.name}
                </p>
                <p className="shrink-0 text-xs text-ink-500">{formatRelativeTime(post.createdAt)}</p>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700">{post.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
