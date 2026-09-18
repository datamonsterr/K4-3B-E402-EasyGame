export type NoticeSourceCard = {
  label: string;
  href: string;
  kind: "pack" | "discord";
};

export type PublicAnswerResponse =
  | {
      status: "answered";
      body: string;
      source: NoticeSourceCard;
      decisionSummary: string;
    }
  | {
      status: "clarify";
      body: string;
      source: null;
      decisionSummary: string;
    }
  | {
      status: "fallback";
      body: string;
      source: null;
      alert: "queued" | "not_queued";
      decisionSummary: string;
    }
  | {
      status: "refused";
      body: string;
      source: null;
      decisionSummary: string;
    };

export type PublicMessageSource = {
  label: string;
  href: string;
  icon: string;
};

export type AssistantMessageViewModel = {
  id: string;
  sender: "assistant";
  content: string;
  timestamp: string;
  isGrounded: boolean;
  sources: PublicMessageSource[];
  decisionSummary: string;
  status: PublicAnswerResponse["status"];
};

export function toAssistantMessage(
  response: PublicAnswerResponse,
): AssistantMessageViewModel {
  const isGrounded = response.status === "answered" && response.source !== null;
  const sources: PublicMessageSource[] =
    isGrounded && response.source
      ? [
          {
            label: response.source.label,
            href: response.source.href,
            icon: "📌",
          },
        ]
      : [];

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender: "assistant",
    content: response.body,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isGrounded,
    sources,
    decisionSummary: response.decisionSummary,
    status: response.status,
  };
}
