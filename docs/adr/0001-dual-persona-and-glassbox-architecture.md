# ADR 0001: Authentication-Based Role Identity and Glass-box Agent Inspector

## Context
During initial demonstration prototyping, a client-side role toggle control allowed evaluators to switch between "Learner" and "Lab Coach" modes on the fly. However, this pattern diverges from real-world security architecture where Discord bots and LMS dashboards operate under authenticated user sessions. Allowing arbitrary role switching creates ambiguity in audit trails, bypasses access control invariants, and complicates session state management.

## Decision
1. **No In-App Role Switching**: Eliminate all dynamic role switcher controls, dropdowns, or segmented buttons. Users cannot switch between roles in the UI.
2. **Credential-Based Authentication**: Users authenticate using their credentials (Username & Password) via standard authentication. Their role (`Learner` or `Lab Coach`) is immutable for the duration of the authenticated session.
3. **Fixed Role Display in Expanded Sidebar**: In the workspace sidebar, beneath the user's name (e.g., `@NguyenVanAn` or `@TA_MinhHai`), their authenticated role is prominently and statically displayed (`Role: Learner` or `Role: Lab Coach`), accompanied by an authentication indicator (`Auth: Username/Password` with security lock icon).
4. **Role-Scoped Workspace Views**:
   - **Learner Session**: Focused on verified logistics chat, inline agent thought inspection, citation deep links, personal ticket status, and project resources.
   - **Lab Coach Session**: Access to staff command tools including `#ta-radar` SLA breach queue, 2-hour soft warnings, 4-hour urgent escalations, channel ingestion telemetry, and 22:00 clean daily digest broadcasting.
5. **Glass-box Transparency**: Maintain inline agent thought process inspection (thinking tokens, tool invocations, latency, factuality verification) directly under inquiries for full auditability.

## Consequences
- **Positive**: Accurately mirrors production RBAC (Role-Based Access Control) and Discord OAuth/SSO integration.
- **Positive**: Clean, uncluttered UI without redundant switching widgets.
- **Positive**: Clear accountability for ticket triage and SLA response tracking.
- **Negative**: Evaluators testing both student and staff perspectives during a demo must log out and log in with the respective persona credentials (`learner_demo` vs `coach_demo`).
