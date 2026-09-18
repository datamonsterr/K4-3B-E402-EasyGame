import Link from "next/link";
import { NoticeChecker } from "@/frontend/notice-checker";
import { demoQuestions, demoTime } from "@/backend/fixtures";
import { evaluateRadar } from "@/backend/radar";
export default function Home() {
  const radar = evaluateRadar(demoQuestions, demoTime);
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">e</span>EasyGame
        </Link>
        <p className="cohort">Cohort workspace</p>
        <nav aria-label="Main navigation">
          <a className="active" href="#notices">
            Verified notices
          </a>
          <a href="#radar">Question radar</a>
          <Link href="/mock/index.html">Full prototype</Link>
          <Link href="/login">Sign in</Link>
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" /> Dataset preview
          <p>Synthetic examples. No live Discord messages.</p>
        </div>
      </aside>
      <main>
        <header>
          <span>EasyGame / Preview</span>
          <span className="pill">Track B</span>
        </header>
        <section className="intro">
          <p className="muted">A clearer day for learners and coaches</p>
          <h1>Your cohort, in view.</h1>
          <p>
            Find the latest course notice. See which questions still need a
            hand.
          </p>
        </section>
        <section id="notices" className="notice-section">
          <div className="section-title">
            <h2>Verified notices</h2>
            <span className="pill">Source included</span>
          </div>
          <NoticeChecker />
        </section>
        <section id="radar">
          <div className="section-title">
            <div>
              <h2>Question radar</h2>
              <p className="muted">
                Example queue at 19:00, September 18, 2026 (Vietnam).
              </p>
            </div>
            <span className="count">{radar.length} active</span>
          </div>
          <div className="radar-list">
            {radar.map((item) => {
              const original = demoQuestions.find((q) => q.id === item.id)!;
              return (
                <article className="radar-row" key={item.id}>
                  <span
                    className={`signal tier-${item.tier}`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="channel">#{original.channel}</p>
                    <h3>{original.question}</h3>
                    <p className="muted">
                      {item.status === "answered"
                        ? "Reply received; resolution unconfirmed"
                        : item.status === "claimed"
                          ? "A Lab Coach is reviewing this"
                          : "Awaiting a response"}
                    </p>
                  </div>
                  <div className="wait-time">
                    <strong>
                      {Math.floor(item.elapsedMinutes / 60)}h{" "}
                      {Math.floor(item.elapsedMinutes % 60)}m
                    </strong>
                    <span>
                      {item.tier === 2
                        ? "Urgent"
                        : item.tier === 1
                          ? "Soft warning"
                          : "Within SLA"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <footer>
          Preview uses synthetic notices and a fixed clock.{" "}
          <Link href="/mock/index.html">
            Explore the full interaction prototype
          </Link>
        </footer>
      </main>
    </div>
  );
}
