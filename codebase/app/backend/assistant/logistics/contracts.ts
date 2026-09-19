declare const actorIdBrand: unique symbol;
declare const guildIdBrand: unique symbol;
declare const noticeIdBrand: unique symbol;

export type ActorId = string & { readonly [actorIdBrand]: "ActorId" };
export type GuildId = string & { readonly [guildIdBrand]: "GuildId" };
export type NoticeId = string & { readonly [noticeIdBrand]: "NoticeId" };

export type Actor = {
  userId: ActorId;
  guildId: GuildId;
  role: "learner" | "lab_coach";
};

export type LogisticsTopic = string;

export type NoticeSourceCard = {
  kind: "pack" | "discord";
  label: string;
  href: string;
};

export type VerifiedNotice = {
  id: NoticeId;
  guildId: GuildId;
  topicKey: LogisticsTopic;
  publishedAt: string;
  answer: string;
  source: NoticeSourceCard;
};

export type AnswerLogisticsRequest = {
  actor: Actor;
  guildId: GuildId;
  message: string;
  history?: readonly {
    role: "user" | "assistant";
    content: string;
  }[];
};

export type AnswerLogisticsResult =
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
    }
  | {
      status: "completed";
      body: string;
      source: null;
      decisionSummary: string;
    };

export interface NoticeEvidenceSource {
  findVerifiedNotices(input: {
    guildId: GuildId;
    topicKey: LogisticsTopic;
  }): Promise<readonly VerifiedNotice[]>;
}

export type LogisticsToolCall = {
  name: string;
  args: unknown;
};

export type LogisticsToolExecutor = (
  call: LogisticsToolCall,
) => Promise<unknown>;

export interface LogisticsDraftProvider {
  draft(input: {
    message: string;
    notice: VerifiedNotice;
    invokeTool: LogisticsToolExecutor;
  }): Promise<string>;
}

export interface LogisticsAssistant {
  answer(request: AnswerLogisticsRequest): Promise<AnswerLogisticsResult>;
}
