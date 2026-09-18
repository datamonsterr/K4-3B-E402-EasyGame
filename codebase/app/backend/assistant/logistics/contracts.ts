declare const actorIdBrand: unique symbol;
declare const guildIdBrand: unique symbol;
declare const noticeIdBrand: unique symbol;

export type ActorId = string & { readonly [actorIdBrand]: "ActorId" };
export type GuildId = string & { readonly [guildIdBrand]: "GuildId" };
export type NoticeId = string & { readonly [noticeIdBrand]: "NoticeId" };

export type Actor = {
  id: ActorId;
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
  topic: LogisticsTopic;
  publishedAt: string;
  answer: string;
  source: NoticeSourceCard;
};

export type AnswerLogisticsRequest = {
  actor: Actor;
  guildId: GuildId;
  message: string;
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
    };

export interface NoticeEvidenceSource {
  findVerifiedNotices(input: {
    guildId: GuildId;
    topic: LogisticsTopic;
  }): Promise<readonly VerifiedNotice[]>;
}

export type LogisticsToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export interface LogisticsToolExecutor {
  execute(
    call: LogisticsToolCall,
    authorizedGuildId: GuildId,
  ): Promise<unknown>;
}

export interface LogisticsDraftProvider {
  draft(input: { message: string; notice: VerifiedNotice }): Promise<string>;
}

export interface LogisticsAssistant {
  answer(request: AnswerLogisticsRequest): Promise<AnswerLogisticsResult>;
}
