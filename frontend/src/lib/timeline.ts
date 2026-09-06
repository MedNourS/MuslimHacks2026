export interface TimelinePost {
  id: string;
  body: string;
  createdAt: string;
  author: { id: number; name: string };
}

export interface UpdateTimelinePostBody {
  body: string;
}
