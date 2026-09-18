# Use Case Specification: UC-B3-01

## 1. Document Control & Identification

| Field | Content |
|---|---|
| **Use Case ID:** | `UC-B3-01` |
| **Use Case Name:** | Select and Lock Cohort Role via Onboarding |
| **Created By:** | Pham Thanh Dat (Lead BA) |
| **Date Created:** | 2026-09-18 |
| **Last Updated By:** | Pham Thanh Dat (Lead BA) |
| **Date Last Updated:** | 2026-09-18 |

---

## 2. Context & Scoping

| Field | Content |
|---|---|
| **Actor:** | **Primary Actor:** Authenticated User (Course Participant or Teaching Assistant)<br>**Secondary Actors:** Supabase Authentication Service, PostgreSQL Database Engine, Stitch Design UI Component |
| **Description:** | Upon completing initial authentication (OAuth or credentials), a newly registered user who has not been provisioned with a cohort role is presented with a high-fidelity Onboarding Screen (designed via Stitch MCP screen `7488d0bd017b434aaf0d0e2ef6f567ea`). The user selects either the `Learner` or `Lab Coach` role. Once submitted, the system commits this role permanently to the `memberships` table. In accordance with strict security invariants, role switching is irrevocably disabled, and the user is routed to their role-calibrated workspace. |
| **Preconditions:** | 1. The user has successfully authenticated and holds an active session cookie/JWT.<br>2. No row exists in `public.memberships` for this user and cohort guild, or the role is unassigned.<br>3. The Stitch-designed onboarding modal component is loaded in the client application. |
| **Postconditions:** | 1. Exactly one record is written to `public.memberships` with the selected role (`learner` or `lab_coach`).<br>2. The role assignment is immutable; any subsequent mutation attempt via client UI or API returns `403 Forbidden`.<br>3. The client transitions immediately to the corresponding workspace (Learner Workspace or Lab Coach Control Deck). |
| **Priority:** | Critical (P0 Security & Access Gate) |
| **Frequency of Use:** | Exactly once per user upon initial onboarding into the cohort. |

---

## 3. Flow of Events

### 3.1. Normal Course of Events (Happy Path)

| Step | Initiator | Action |
|:---:|:---:|---|
| 1 | **Authenticated User** | Completes authentication (Discord OAuth, Google SSO, or email) and arrives at the application workspace URL (`/workspace`). |
| 2 | **Application Frontend** | Checks session membership metadata and detects that the user has not completed role provisioning. |
| 3 | **Stitch Design UI Component** | Renders the modal overlay **"Select Your Cohort Role"** (Screen ID `7488d0bd017b434aaf0d0e2ef6f567ea`), displaying side-by-side cards for `Learner` (Cyan) and `Lab Coach` (Amber) along with the immutable role lock warning. |
| 4 | **Authenticated User** | Evaluates the displayed tool permissions, clicks the desired role card (e.g. `Learner`), and clicks the confirmation action button (`Continue as Learner →`). |
| 5 | **Application Frontend** | Dispatches a role provisioning payload `POST /api/auth/role` with `{ role: "learner" }`. |
| 6 | **PostgreSQL Database Engine** | Verifies that no previous role is locked for this user, inserts the membership record `(guild_id, user_id, 'learner')`, and sets session permissions. |
| 7 | **Application Frontend** | Receives `200 OK`, updates local session cookies (`eg_demo_role=learner`), hides the onboarding modal, and permanently disables role switching triggers in the interface. |
| 8 | **Authenticated User** | Enters the Learner workspace featuring Grounded Logistics Chat, Official Notices, and personal query tracking. |

---

### 3.2. Alternative Courses

#### UC-B3-01.AC.1: Lab Coach Role Selection
* **Trigger:** At Step 4 of the Normal Course, the user selects the `Lab Coach / TA` card and clicks `Continue as Lab Coach →`.
* **Execution Flow:**
  1. The frontend dispatches `POST /api/auth/role` with `{ role: "lab_coach" }`.
  2. The database writes `(guild_id, user_id, 'lab_coach')`.
  3. The client receives `200 OK`, stores `eg_demo_role=lab_coach`, and renders the Lab Coach workspace.
  4. The user gains access to the `#ta-radar` SLA breach queue, in-app Messages triage, student profile inspection, and cohort announcement broadcasting.
  5. The flow terminates at Step 8 with coach privileges locked.

---

### 3.3. Exceptions

#### UC-B3-01.EX.1: Attempted Post-Onboarding Role Mutation (Immutable Lock Violation)
* **Trigger Condition:** A user who has already completed onboarding submits a payload to `POST /api/auth/role` attempting to switch from `learner` to `lab_coach` or vice-versa.
* **System Response:**
  1. The server-side API handler queries `public.memberships` for `(guild_id, auth.uid())`.
  2. The server detects that a role is already established.
  3. The server rejects the mutation with HTTP status `403 Forbidden` and error body: `{"error": "Role is permanently locked after onboarding and cannot be changed"}`.
  4. The client rolls back any speculative UI change and retains the originally provisioned role.
* **Final State:** Database membership remains unaltered, preserving the zero-trust security invariant.

#### UC-B3-01.EX.2: Database Unavailability or Network Disruption During Provisioning
* **Trigger Condition:** At Step 6 of the Normal Course, the database connection times out or fails.
* **System Response:**
  1. The API returns HTTP status `502 Bad Gateway` or `503 Service Unavailable`.
  2. The Onboarding modal remains open, displays an informative error toast: *"Role provisioning could not be saved to server. Please try again."*, and re-enables the submission button.
* **Final State:** User remains on the onboarding screen without partial or corrupted state.

---

## 4. Supplementary Specifications

| Field | Content |
|---|---|
| **Includes:** | None |
| **Special Requirements:** | 1. **Visual Fidelity:** The onboarding modal must strictly conform to Stitch MCP Screen `7488d0bd017b434aaf0d0e2ef6f567ea` and the *Technical Cyan Minimal* design tokens (Obsidian `#09090b` canvas, cyan `#06b6d4` learner accent, amber `#f59e0b` coach accent).<br>2. **Immutability Invariant:** Neither client local storage tampering nor forged API payloads can bypass the database role check.<br>3. **Zero UI Role Switcher:** Regular workspace navigation must contain no dropdown, modal, or setting that permits changing roles after onboarding. |
| **Assumptions:** | 1. Cohort members are informed by course administration prior to sign-in regarding their designated role.<br>2. Trusted operators retain direct database access for administrative corrections in exceptional circumstances. |
| **Notes and Issues:** | None. Supersedes the legacy `RoleModal` temporary switcher from prototype baseline. |

---

## 5. Quality Validation Checklist (20/20 Standard)

| # | Item | Status | Verification Note |
|:---:|---|:---:|---|
| **C1** | Name follows "verb + object", active voice | ✅ | *"Select and Lock Cohort Role via Onboarding"* is active verb + object. |
| **C2** | User-goal level (passes coffee-break test) | ✅ | Completes an atomic onboarding milestone; user pauses afterward. |
| **C3** | Unique ID following naming convention | ✅ | `UC-B3-01` conforms to the new Module B3 onboarding hierarchy. |
| **C4** | Exactly 1 primary actor + 1 clear goal | ✅ | Primary Actor: Authenticated User; Goal: Establish and lock verified role. |
| **C5** | System boundary clearly delineated | ✅ | Governs boundary between Client Modal, Auth API, and PostgreSQL DB. |
| **C6** | Specific actor role, not generic "User" | ✅ | Uses Authenticated User explicitly defined in context. |
| **C7** | Description covers Why + What + Outcome | ✅ | States why (security/calibration), what (onboarding), and outcome (immutable role). |
| **C8** | Frequency of Use is quantified | ✅ | Quantified as exactly once per user upon cohort enrollment. |
| **C9** | Preconditions are verifiable system states | ✅ | Validates authentication state, unassigned membership, and modal load. |
| **C10** | Postconditions verify success state & changes | ✅ | Validates database record creation, immutability, and workspace routing. |
| **C11** | Preconditions distinct from Assumptions | ✅ | Distinguishes system checks from administrative assumptions. |
| **C12** | Numbered list, one action per step | ✅ | Linear steps 1 through 8 with explicit actions. |
| **C13** | Alternates Actor / System with clear subjects | ✅ | Cleanly toggles between User, Frontend, Stitch UI, and Database Engine. |
| **C14** | NO embedded if/else/loop in Normal Course | ✅ | Happy path is linear; coach selection and errors in ACs/EXs. |
| **C15** | Flow runs from trigger to postcondition | ✅ | Runs from post-sign-in trigger to locked workspace landing. |
| **C16** | ACs specify "at step N" + triggering condition | ✅ | AC.1 explicitly triggers at Step 4. |
| **C17** | Exceptions define trigger + response + final state | ✅ | EX.1 and EX.2 state trigger, response, and terminal state. |
| **C18** | Common failure modes covered | ✅ | Covers mutation hacking and network/database failure. |
| **C19** | Includes point to existing valid UCs | ✅ | Marked `None` (atomic sea-level goal). |
| **C20** | Special Requirements are non-functional | ✅ | Details design system fidelity, security invariants, and UI cleanliness. |
