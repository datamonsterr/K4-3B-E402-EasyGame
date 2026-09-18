-- ============================================================
-- EasyGame Discord Assistant — Database Schema
-- Track B1: Logistics Bot | Track B2: Radar & Daily Digest
-- Version: 1.0 | Date: 2026-09-18
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE 0: user_profiles
-- Liên kết Supabase Auth user với role trong ứng dụng
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT,
    role       TEXT        NOT NULL DEFAULT 'learner'
               CHECK (role IN ('learner', 'coach')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security: user chỉ đọc/sửa profile của chính mình
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_profile" ON user_profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "service_role_all" ON user_profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- TABLE 1: discord_messages
-- Source: k4_messages.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS discord_messages (
    id            BIGSERIAL PRIMARY KEY,
    msg_id        TEXT        NOT NULL UNIQUE,
    guild         TEXT        NOT NULL,
    channel       TEXT        NOT NULL,
    author        TEXT        NOT NULL,
    is_bot        BOOLEAN     NOT NULL DEFAULT FALSE,
    msg_type      TEXT        NOT NULL CHECK (msg_type IN ('message', 'reply')),
    created_at_vn TIMESTAMPTZ NOT NULL,
    reply_to      TEXT        REFERENCES discord_messages(msg_id) ON DELETE SET NULL,
    mentions_bot  BOOLEAN     NOT NULL DEFAULT FALSE,
    n_attachments INTEGER     NOT NULL DEFAULT 0,
    n_chars       INTEGER     NOT NULL DEFAULT 0,
    content       TEXT,
    intent_label  TEXT,
    is_question   BOOLEAN     GENERATED ALWAYS AS (content LIKE '%?%') STORED,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_guild_channel ON discord_messages(guild, channel);
CREATE INDEX IF NOT EXISTS idx_dm_author        ON discord_messages(author);
CREATE INDEX IF NOT EXISTS idx_dm_created_at_vn ON discord_messages(created_at_vn DESC);
CREATE INDEX IF NOT EXISTS idx_dm_is_bot        ON discord_messages(is_bot);
CREATE INDEX IF NOT EXISTS idx_dm_mentions_bot  ON discord_messages(mentions_bot);
CREATE INDEX IF NOT EXISTS idx_dm_is_question   ON discord_messages(is_question);

-- ============================================================
-- TABLE 2: official_notices
-- Thông báo chính thức từ BTC/Admin — nguồn sự thật cho RAG
-- ============================================================
CREATE TABLE IF NOT EXISTS official_notices (
    id            BIGSERIAL PRIMARY KEY,
    msg_id        TEXT        REFERENCES discord_messages(msg_id),
    guild         TEXT        NOT NULL,
    channel       TEXT        NOT NULL,
    author_role   TEXT        NOT NULL CHECK (author_role IN ('Admin','Instructor','Lead_TA','BTC')),
    title         TEXT        NOT NULL,
    content       TEXT        NOT NULL,
    notice_ts     TIMESTAMPTZ NOT NULL,
    tags          TEXT[]      DEFAULT '{}',
    is_superseded BOOLEAN     NOT NULL DEFAULT FALSE,
    superseded_by BIGINT      REFERENCES official_notices(id),
    discord_link  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_on_notice_ts  ON official_notices(notice_ts DESC);
CREATE INDEX IF NOT EXISTS idx_on_tags       ON official_notices USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_on_superseded ON official_notices(is_superseded);

-- ============================================================
-- TABLE 3: questions_tracker
-- Theo dõi câu hỏi của học viên và SLA
-- ============================================================
CREATE TABLE IF NOT EXISTS questions_tracker (
    id                  BIGSERIAL PRIMARY KEY,
    msg_id              TEXT        NOT NULL UNIQUE REFERENCES discord_messages(msg_id),
    guild               TEXT        NOT NULL,
    channel             TEXT        NOT NULL,
    author              TEXT        NOT NULL,
    asked_at            TIMESTAMPTZ NOT NULL,
    intent_label        TEXT,
    question_summary    TEXT,
    status              TEXT        NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','BOT_ANSWERED','TA_ANSWERED','RESOLVED','IGNORED')),
    first_response_at   TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    wait_minutes        INTEGER GENERATED ALWAYS AS (
        CASE WHEN first_response_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (first_response_at - asked_at))::INTEGER / 60
        END
    ) STORED,
    sla_tier            TEXT CHECK (sla_tier IS NULL OR sla_tier IN ('SOFT_2H','URGENT_4H')),
    bot_response_msg_id TEXT,
    bot_confidence      NUMERIC(4,3),
    discord_link        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qt_status   ON questions_tracker(status);
CREATE INDEX IF NOT EXISTS idx_qt_asked_at ON questions_tracker(asked_at DESC);
CREATE INDEX IF NOT EXISTS idx_qt_sla_tier ON questions_tracker(sla_tier);
CREATE INDEX IF NOT EXISTS idx_qt_guild_ch ON questions_tracker(guild, channel);

-- ============================================================
-- TABLE 4: sla_alerts
-- Lịch sử cảnh báo SLA gửi vào #ta-radar (FR-202)
-- ============================================================
CREATE TABLE IF NOT EXISTS sla_alerts (
    id                  BIGSERIAL PRIMARY KEY,
    question_tracker_id BIGINT      NOT NULL REFERENCES questions_tracker(id),
    tier                TEXT        NOT NULL CHECK (tier IN ('SOFT_2H','URGENT_4H')),
    alerted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    alert_msg_id        TEXT,
    ta_mention          TEXT,
    is_acknowledged     BOOLEAN     NOT NULL DEFAULT FALSE,
    acknowledged_at     TIMESTAMPTZ,
    acknowledged_by     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sla_question_id ON sla_alerts(question_tracker_id);
CREATE INDEX IF NOT EXISTS idx_sla_tier        ON sla_alerts(tier);
CREATE INDEX IF NOT EXISTS idx_sla_alerted_at  ON sla_alerts(alerted_at DESC);

-- ============================================================
-- TABLE 5: daily_digest
-- Bản tin ngày sạch lỗi (FR-204), xuất 22:00 hàng ngày
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_digest (
    id                BIGSERIAL PRIMARY KEY,
    guild             TEXT        NOT NULL,
    digest_date       DATE        NOT NULL,
    total_questions   INTEGER     NOT NULL DEFAULT 0,
    answered_count    INTEGER     NOT NULL DEFAULT 0,
    open_2h_count     INTEGER     NOT NULL DEFAULT 0,
    open_4h_count     INTEGER     NOT NULL DEFAULT 0,
    top_topics        JSONB       DEFAULT '[]',
    pending_questions JSONB       DEFAULT '[]',
    digest_content    TEXT,
    posted_msg_id     TEXT,
    posted_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (guild, digest_date)
);

CREATE INDEX IF NOT EXISTS idx_dd_date  ON daily_digest(digest_date DESC);
CREATE INDEX IF NOT EXISTS idx_dd_guild ON daily_digest(guild);

-- ============================================================
-- TABLE 6: feedback_reports
-- Nút [Báo sai thông tin] — HAX G8/G9
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_reports (
    id            BIGSERIAL PRIMARY KEY,
    bot_msg_id    TEXT        NOT NULL,
    reporter      TEXT        NOT NULL,
    guild         TEXT        NOT NULL,
    channel       TEXT        NOT NULL,
    report_ts     TIMESTAMPTZ NOT NULL DEFAULT now(),
    feedback_type TEXT        NOT NULL DEFAULT 'WRONG_INFO'
                  CHECK (feedback_type IN ('WRONG_INFO','TOO_LONG','NO_SOURCE','OTHER')),
    note          TEXT,
    is_reviewed   BOOLEAN     NOT NULL DEFAULT FALSE,
    reviewed_by   TEXT,
    reviewed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fr_bot_msg   ON feedback_reports(bot_msg_id);
CREATE INDEX IF NOT EXISTS idx_fr_report_ts ON feedback_reports(report_ts DESC);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW vw_open_questions AS
SELECT
    qt.id,
    qt.msg_id,
    qt.guild,
    qt.channel,
    qt.author,
    qt.asked_at,
    qt.intent_label,
    qt.question_summary,
    qt.status,
    qt.sla_tier,
    qt.discord_link,
    EXTRACT(EPOCH FROM (now() - qt.asked_at))::INTEGER / 60 AS wait_minutes_now,
    dm.content AS original_content
FROM questions_tracker qt
JOIN discord_messages dm ON dm.msg_id = qt.msg_id
WHERE qt.status = 'OPEN'
ORDER BY qt.asked_at ASC;

CREATE OR REPLACE VIEW vw_guild_stats AS
SELECT
    guild,
    COUNT(*)                                              AS total_messages,
    COUNT(*) FILTER (WHERE is_bot = FALSE)                AS human_messages,
    COUNT(*) FILTER (WHERE is_bot = TRUE)                 AS bot_messages,
    COUNT(*) FILTER (WHERE is_question = TRUE AND is_bot = FALSE) AS total_questions,
    COUNT(*) FILTER (WHERE mentions_bot = TRUE)           AS bot_mentions,
    ROUND(AVG(n_chars) FILTER (WHERE is_bot = FALSE))     AS avg_human_msg_length,
    ROUND(AVG(n_chars) FILTER (WHERE is_bot = TRUE))      AS avg_bot_msg_length
FROM discord_messages
GROUP BY guild;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE discord_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_notices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions_tracker  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_digest       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_reports   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON discord_messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON official_notices
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON questions_tracker
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON sla_alerts
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON daily_digest
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON feedback_reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Read-only cho anon (dev/debug) — XÓA khi production nếu cần
CREATE POLICY "anon_read_messages" ON discord_messages
    FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_notices" ON official_notices
    FOR SELECT TO anon USING (true);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION update_sla_tiers()
RETURNS INTEGER AS $$
DECLARE updated INTEGER;
BEGIN
    UPDATE questions_tracker
    SET sla_tier = CASE
        WHEN EXTRACT(EPOCH FROM (now() - asked_at)) / 3600 >= 4 THEN 'URGENT_4H'
        WHEN EXTRACT(EPOCH FROM (now() - asked_at)) / 3600 >= 2 THEN 'SOFT_2H'
        ELSE sla_tier
    END
    WHERE status = 'OPEN'
      AND sla_tier IS DISTINCT FROM CASE
        WHEN EXTRACT(EPOCH FROM (now() - asked_at)) / 3600 >= 4 THEN 'URGENT_4H'
        WHEN EXTRACT(EPOCH FROM (now() - asked_at)) / 3600 >= 2 THEN 'SOFT_2H'
        ELSE sla_tier
    END;
    GET DIAGNOSTICS updated = ROW_COUNT;
    RETURN updated;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_question(p_msg_id TEXT, p_resolver TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE questions_tracker
    SET status      = 'RESOLVED',
        resolved_at = now()
    WHERE msg_id = p_msg_id AND status != 'RESOLVED';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED: Kiểm tra sau import CSV
-- SELECT COUNT(*) FROM discord_messages;          -- phải ra 1092
-- SELECT * FROM vw_guild_stats;
-- ============================================================

