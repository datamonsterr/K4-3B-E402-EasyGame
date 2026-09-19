import type { Notice } from "./assistant";
import type { RadarQuestion } from "./radar";
export const notices: Notice[] = [
  {
    id: "original",
    guildId: "demo",
    topicKey: "lab-1",
    publishedAt: "2026-09-12T03:00:00Z",
    verified: true,
    answer:
      "Lab 1 is due at 21:00 on September 17, 2026 (21:00 ngày 17/09/2026).",
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
    answer:
      "Lab 1 is due at 12:00 on September 19, 2026 (12:00 ngày 19/09/2026).",
    source: {
      kind: "synthetic",
      label: "Lab 1 extension (synthetic)",
      href: "/sources/extension",
    },
  },
  {
    id: "checkpoint-1",
    guildId: "demo",
    topicKey: "checkpoint",
    publishedAt: "2026-09-15T03:00:00Z",
    verified: true,
    answer:
      "Checkpoint 1 is due at 21:00 on September 17, 2026 (21:00 ngày 17/09/2026).",
    source: {
      kind: "synthetic",
      label: "Checkpoint 1 notice (synthetic)",
      href: "/sources/checkpoint-1",
    },
  },
  {
    id: "lab-two-old",
    guildId: "demo",
    topicKey: "lab-2",
    publishedAt: "2026-09-13T03:00:00Z",
    verified: true,
    answer:
      "Submit Lab 2 through the course portal by 23:59 on September 18, 2026.",
    source: {
      kind: "synthetic",
      label: "Lab 2 original notice (synthetic)",
      href: "/sources/lab-two-old",
    },
  },
  {
    id: "lab-two",
    guildId: "demo",
    topicKey: "lab-2",
    publishedAt: "2026-09-14T15:00:00Z",
    verified: true,
    answer:
      "Submit Lab 2 through the course portal by 12:00 on September 19, 2026 (12:00 ngày 19/09/2026).",
    source: {
      kind: "synthetic",
      label: "Lab 2 notice (synthetic)",
      href: "/sources/lab-two",
    },
  },
  {
    id: "attendance-policy",
    guildId: "demo",
    topicKey: "attendance",
    publishedAt: "2026-09-13T03:00:00Z",
    verified: true,
    answer:
      "Quy chế điểm danh: Học viên cần tham gia tối thiểu 80% số buổi. Các buổi workshop tối và định hướng Build Phase không tính vào số buổi nghỉ trên lớp.",
    source: {
      kind: "synthetic",
      label: "Attendance policy notice (synthetic)",
      href: "/sources/attendance-policy",
    },
  },
  {
    id: "checkpoint-cp1",
    guildId: "demo",
    topicKey: "checkpoint-cp1",
    publishedAt: "2026-09-15T03:00:00Z",
    verified: true,
    answer:
      "Hạn nộp mốc Checkpoint 1 CP1 là 19:30 ngày 16/09/2026 trên hệ thống LMS.",
    source: {
      kind: "synthetic",
      label: "Checkpoint CP1 notice (synthetic)",
      href: "/sources/checkpoint-cp1",
    },
  },
  {
    id: "checkpoint-cp2",
    guildId: "demo",
    topicKey: "checkpoint-cp2",
    publishedAt: "2026-09-17T03:00:00Z",
    verified: true,
    answer:
      "Hạn nộp mốc Checkpoint CP2 là 12:00 ngày 21/09/2026 (12 giờ trưa).",
    source: {
      kind: "synthetic",
      label: "Checkpoint CP2 notice (synthetic)",
      href: "/sources/checkpoint-cp2",
    },
  },
  {
    id: "team-formation",
    guildId: "demo",
    topicKey: "team-formation",
    publishedAt: "2026-09-11T03:00:00Z",
    verified: true,
    answer:
      "Quy định quy mô nhóm dự án Hackathon là từ 3 đến 4 thành viên mỗi nhóm.",
    source: {
      kind: "synthetic",
      label: "Team formation policy (synthetic)",
      href: "/sources/team-formation",
    },
  },
  {
    id: "location-e402",
    guildId: "demo",
    topicKey: "location",
    publishedAt: "2026-09-10T03:00:00Z",
    verified: true,
    answer: "Phòng thực hành lab cho lớp 3B được bố trí tại phòng E402.",
    source: {
      kind: "synthetic",
      label: "Lab location notice (synthetic)",
      href: "/sources/location-e402",
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
