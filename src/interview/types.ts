export type TranscriptEntry = [seconds: number, html: string, kind: "question" | "answer"];
export type IndexEntry = [seconds: number, title: string];

export interface InterviewData {
  title: string;
  url: string;
  url_back: string;
  date: string;
  location: string;
  thumbnail: string;
  totalDuration: number;
  narrator: { name: string };
  interviewers: { name: string }[];
  summary: string;
  bios: string[];
  sessions: {
    media: "video";
    video: {
      src: string;
      duration: number;
      captions: { label: string; srclang: string; src: string }[];
    };
    index: IndexEntry[];
    transcript: TranscriptEntry[];
  }[];
  related: { title: string; url: string; image: string }[];
  downloads: { name: string; ext: string; size: string; url: string }[];
}

/** `H:MM:SS`, always with hours. */
export function timecode(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
