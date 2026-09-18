export type RadarQuestion = {
  id: string;
  sentAt: string;
  status: "open" | "claimed" | "answered" | "resolved";
};
export type RadarItem = RadarQuestion & {
  elapsedMinutes: number;
  tier: 0 | 1 | 2;
};
export function evaluateRadar(
  questions: readonly RadarQuestion[],
  now: Date,
): RadarItem[] {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid scan time");
  return questions
    .filter((q) => q.status !== "resolved")
    .map((q) => {
      const sent = Date.parse(q.sentAt);
      if (!Number.isFinite(sent)) throw new Error("Invalid question timestamp");
      const elapsedMinutes = Math.max(0, (now.getTime() - sent) / 60000);
      return {
        ...q,
        elapsedMinutes,
        tier:
          elapsedMinutes >= 240
            ? (2 as const)
            : elapsedMinutes >= 120
              ? (1 as const)
              : (0 as const),
      };
    })
    .sort(
      (a, b) => b.elapsedMinutes - a.elapsedMinutes || a.id.localeCompare(b.id),
    );
}
