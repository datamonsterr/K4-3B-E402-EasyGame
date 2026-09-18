import type { Notice } from "./assistant";
import type { RadarQuestion } from "./radar";
export const notices: Notice[] = [
  {
    id: "original",
    guildId: "demo",
    topicKey: "lab-1",
    publishedAt: "2026-09-12T03:00:00Z",
    verified: true,
    answer: "Lab 1 is due at 21:00 on September 17, 2026.",
    source: {
      kind: "synthetic",
      label: "Lab 1 original notice (synthetic)",
      href: "/sources/original",
    },
  },
  {
    id: "extension",
    guildId: "demo",
    topicKey: "lab-1",
    publishedAt: "2026-09-14T03:00:00Z",
    verified: true,
    answer: "Lab 1 is due at 12:00 on September 19, 2026.",
    source: {
      kind: "synthetic",
      label: "Lab 1 extension (synthetic)",
      href: "/sources/extension",
    },
  },
  {
    id: "lab-two",
    guildId: "demo",
    topicKey: "lab-2",
    publishedAt: "2026-09-14T03:00:00Z",
    verified: true,
    answer:
      "Submit Lab 2 through the course portal by 21:00 on September 21, 2026.",
    source: {
      kind: "synthetic",
      label: "Lab 2 notice (synthetic)",
      href: "/sources/lab-two",
    },
  },
];
export const demoTime = new Date("2026-09-18T12:00:00Z");
export const demoQuestions: (RadarQuestion & {
  question: string;
  channel: string;
})[] = [
  {
    id: "setup",
    sentAt: "2026-09-18T07:30:00Z",
    status: "open",
    question: "My environment fails during setup. Where should I start?",
    channel: "lab-support",
  },
  {
    id: "upload",
    sentAt: "2026-09-18T09:45:00Z",
    status: "answered",
    question: "Which file format should I upload for the checkpoint?",
    channel: "course-questions",
  },
  {
    id: "team",
    sentAt: "2026-09-18T11:15:00Z",
    status: "claimed",
    question: "Can our team update its project title?",
    channel: "discussion",
  },
];
