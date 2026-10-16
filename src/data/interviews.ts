export interface InterviewTeaser {
  slug: string;
  name: string;
  location: string;
  role: string;
  description: string;
  clip: number;
}

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.";

export const TEASERS: InterviewTeaser[] = [
  ["Test Speaker A", "Sample City, AA", ""],
  ["Test Speaker B", "Sample City, BB", ""],
  ["Test Speaker C", "Sample City, CC", "Placeholder role description"],
  ["Test Speaker D", "Sample City, DD", ""],
  ["Test Speaker E", "Sample City, EE", "Placeholder role and organisation"],
  ["Test Speaker F", "Sample City, FF", ""],
  ["Test Speaker G", "Sample City, GG", ""],
  ["Test Speaker H", "Sample City, HH", "Placeholder role"],
  ["Test Speaker I", "Sample City, II", ""],
].map(([name, location, role], i) => ({
  // Every tile opens the one sample interview; the slug keeps the URL shape realistic.
  slug: "test-speaker-a",
  name,
  location,
  role,
  description: LOREM,
  clip: i + 1,
}));
