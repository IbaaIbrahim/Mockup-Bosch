# Data Model, Seed Data & Mock External Systems

> **⚠ SCOPE NOTE.** For the current §3.2 conference build ([`09-SCOPE-CONFERENCE-DEMO.md`](./09-SCOPE-CONFERENCE-DEMO.md)) the engine is **SQLite via Drizzle**, not Postgres. Tables, columns, seed data and relationships are unchanged; only types differ (`TEXT` for enums, `INTEGER` for booleans, ISO-8601 strings for timestamps). §2 (App 1 tables: tasks, task_offers, task_events, ingest_log, AI tables) and the `DB_Shiftbook` view are **deferred**. §3, §4, §6 and §7 are in scope as written.

PostgreSQL 16 · Drizzle ORM · all timestamps stored UTC (`timestamptz`), displayed Europe/Berlin.

Design stance (deviation D1 from `00-OVERVIEW.md`): we run a **normalised schema with an append-only event log**, and expose **SQL views named exactly as the PDF names its tables**, with exactly the PDF's columns. This gives us referential integrity, auditability and idempotency internally, while `SELECT * FROM "DB_Shiftbook"` on the projector returns literally what §3.1.3.2 specifies. Both audiences are satisfied without compromise.

---

## 1. Schema overview

```
users ──< user_skills >── skills
  │
  ├──< tasks >── task_events
  │        │
  │        ├── task_solutions ──> solution_options ──> error_codes
  │        ├── task_photos
  │        └── ai_conversations ──< ai_messages
  │
lines ──< line_stations
  │
ingest_log (append-only, every telegram)

tbl_parcels ──< parcel_events
tbl_storage_locations
carrier_formats
location_reservations

mock_sap_orders            (simulated SAP_ERP)
mock_directory_users       (simulated Bosch_Active_Directory)
mock_emails                (simulated SMTP sink)

manual_documents ──< manual_chunks (pgvector embeddings)
```

---

## 2. DDL — App 1 domain

### 2.1 Reference data

```sql
CREATE TABLE lines (
  line_no        VARCHAR(10) PRIMARY KEY,     -- '31', '10'
  display_name   VARCHAR(80) NOT NULL,        -- 'Line 31 — SMT Assembly'
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE line_stations (
  line_no        VARCHAR(10) NOT NULL REFERENCES lines(line_no),
  stat_no        VARCHAR(10) NOT NULL,        -- '20'
  process_name   VARCHAR(120) NOT NULL,       -- 'Paste Printer'
  process_no     VARCHAR(20),
  PRIMARY KEY (line_no, stat_no)
);

CREATE TABLE skills (
  skill_id       VARCHAR(40) PRIMARY KEY,     -- 'TRANSPORT_BELT_MAINTENANCE'
  display_name   VARCHAR(80) NOT NULL         -- 'Transport Belt Maintenance'
);

CREATE TABLE error_codes (
  error_no       VARCHAR(10) PRIMARY KEY,     -- '50', '70'
  default_text   VARCHAR(200) NOT NULL,       -- 'Barcode not readable'
  requires_skill VARCHAR(40) REFERENCES skills(skill_id),   -- NULL = no skill filter
  requires_four_eyes BOOLEAN NOT NULL DEFAULT FALSE
);
```

`error_codes` is where §3.1.4 C lives **as data**. Error 50: no required skill, four-eyes TRUE. Error 70: requires `TRANSPORT_BELT_MAINTENANCE`, four-eyes FALSE. Changing the policy live is an UPDATE, not a deploy — worth demonstrating if asked.

### 2.2 Users

```sql
CREATE TYPE user_role AS ENUM ('TECHNICIAN', 'SUPERVISOR', 'ADMIN');

CREATE TABLE users (
  user_id        VARCHAR(20) PRIMARY KEY,     -- '101', '102', '201'
  display_name   VARCHAR(80) NOT NULL,
  role           user_role NOT NULL,
  email          VARCHAR(120),
  is_on_shift    BOOLEAN NOT NULL DEFAULT TRUE,
  push_endpoint  TEXT
);

CREATE TABLE user_lines (
  user_id VARCHAR(20) REFERENCES users(user_id),
  line_no VARCHAR(10) REFERENCES lines(line_no),
  PRIMARY KEY (user_id, line_no)
);

CREATE TABLE user_skills (
  user_id  VARCHAR(20) REFERENCES users(user_id),
  skill_id VARCHAR(40) REFERENCES skills(skill_id),
  PRIMARY KEY (user_id, skill_id)
);
```

### 2.3 Tasks

```sql
CREATE TYPE task_status AS ENUM (
  'OFFERED','ASSIGNED','IN_PROGRESS','AWAITING_RELEASE',
  'CLOSED','AUTO_CLOSED','CANCELLED'
);
CREATE TYPE task_priority AS ENUM ('HIGH','LOW');

CREATE TABLE tasks (
  task_id            BIGSERIAL PRIMARY KEY,
  event_id           VARCHAR(40),
  idempotency_key    VARCHAR(64) UNIQUE,
  line_no            VARCHAR(10) NOT NULL,   -- deliberately NOT a foreign key, see below
  stat_no            VARCHAR(10) NOT NULL,
  process_name       VARCHAR(120) NOT NULL,
  error_no           VARCHAR(10) NOT NULL,   -- deliberately NOT a foreign key, see below
  error_text         VARCHAR(200) NOT NULL,
  error_type         VARCHAR(4)  NOT NULL,    -- '1' error, '2' warning
  operation_mode     VARCHAR(4)  NOT NULL,
  priority           task_priority NOT NULL,
  status             task_status NOT NULL DEFAULT 'OFFERED',
  requires_four_eyes BOOLEAN NOT NULL,
  offer_round        SMALLINT NOT NULL DEFAULT 1,
  escalated          BOOLEAN NOT NULL DEFAULT FALSE,
  assignee_user_id   VARCHAR(20) REFERENCES users(user_id),
  supervisor_user_id VARCHAR(20) REFERENCES users(user_id),
  safety_ack_at      TIMESTAMPTZ,
  solution_option_id INT,
  solution_free_text TEXT,
  operator_comment   TEXT,
  closure_reason     VARCHAR(40),             -- 'OPERATOR','FOUR_EYES','AUTO_RESOLVED','REJECTED'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  offered_at         TIMESTAMPTZ,
  offer_expires_at   TIMESTAMPTZ,
  accepted_at        TIMESTAMPTZ,
  closed_at          TIMESTAMPTZ,
  raw_payload        JSONB NOT NULL
);

CREATE INDEX idx_tasks_open_match
  ON tasks (line_no, stat_no, error_no)
  WHERE status IN ('OFFERED','ASSIGNED','IN_PROGRESS','AWAITING_RELEASE');
```

That partial index is what makes the `errorState=1` auto-archive lookup instant (Gate G6).

**Why `line_no` and `error_no` on `tasks` are not foreign keys.** Bosch will send live payloads, and a value we have never seen must never cause a database error on stage. Presets P8 (`lineNo="99"`) and P9 (`errorNo="88"`) in the runbook depend on this: an unknown line escalates immediately and an unknown error code creates a task with the generic solution set, both flagged in `ingest_log`. Referential integrity for these two columns is enforced in the engine, which can degrade gracefully; the database cannot. Every other relationship in the schema is a real foreign key.

`error_codes` and `lines` are still the lookup source for policy — they are simply not a constraint on what may be recorded.

```sql
CREATE TABLE task_offers (          -- who a task was offered to, per round
  task_id   BIGINT REFERENCES tasks(task_id),
  user_id   VARCHAR(20) REFERENCES users(user_id),
  round     SMALLINT NOT NULL,
  response  VARCHAR(10),            -- 'ACCEPT','DECLINE', NULL = no response
  responded_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, user_id, round)
);

CREATE TABLE task_events (          -- append-only audit trail
  event_pk   BIGSERIAL PRIMARY KEY,
  task_id    BIGINT NOT NULL REFERENCES tasks(task_id),
  kind       VARCHAR(40) NOT NULL, -- CREATED, OFFERED, DECLINED, ACCEPTED,
                                    -- SAFETY_ACK, SOLUTION_SELECTED, PHOTO_ADDED,
                                    -- COMMENT_ADDED, RELEASE_REQUESTED, APPROVED,
                                    -- REJECTED, CLOSED, AUTO_ARCHIVED, ESCALATED
  actor_user_id VARCHAR(20) REFERENCES users(user_id),
  payload    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE solution_options (
  option_id    SERIAL PRIMARY KEY,
  error_no     VARCHAR(10) NOT NULL REFERENCES error_codes(error_no),
  label        VARCHAR(160) NOT NULL,
  sort_order   SMALLINT NOT NULL,
  is_other     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE task_photos (
  photo_id     BIGSERIAL PRIMARY KEY,
  task_id      BIGINT NOT NULL REFERENCES tasks(task_id),
  storage_path TEXT NOT NULL,
  mime_type    VARCHAR(40) NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata     JSONB          -- {line, stat, errorNo, operator}
);
```

### 2.4 Ingest log

```sql
CREATE TABLE ingest_log (
  ingest_id     BIGSERIAL PRIMARY KEY,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_body      TEXT NOT NULL,
  parsed        JSONB,
  decision      VARCHAR(30) NOT NULL,  -- CREATE_TASK, AUTO_ARCHIVE, IGNORE,
                                        -- ESCALATE_IMMEDIATE, REJECTED
  reason        TEXT NOT NULL,
  rule_trace    JSONB NOT NULL,        -- ordered rule-by-rule evaluation
  task_id       BIGINT REFERENCES tasks(task_id),
  latency_ms    INT NOT NULL,
  deduplicated  BOOLEAN NOT NULL DEFAULT FALSE
);
```

`rule_trace` is what renders in the Ops Console right pane. Storing it means the narration is reproducible after the fact.

### 2.5 AI

```sql
CREATE TABLE ai_conversations (
  conversation_id BIGSERIAL PRIMARY KEY,
  task_id         BIGINT REFERENCES tasks(task_id),
  user_id         VARCHAR(20) REFERENCES users(user_id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_messages (
  message_id      BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES ai_conversations(conversation_id),
  role            VARCHAR(12) NOT NULL,   -- 'user' | 'assistant' | 'system'
  content         TEXT NOT NULL,
  citations       JSONB,                  -- [{document, section, page}]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE manual_documents (
  document_id  VARCHAR(60) PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  file_path    TEXT NOT NULL,
  applies_to_line VARCHAR(10)
);

CREATE TABLE manual_chunks (
  chunk_id     BIGSERIAL PRIMARY KEY,
  document_id  VARCHAR(60) NOT NULL REFERENCES manual_documents(document_id),
  section      VARCHAR(80),
  page         INT,
  content      TEXT NOT NULL,
  embedding    vector(1536)
);
CREATE INDEX ON manual_chunks USING hnsw (embedding vector_cosine_ops);
```

---

## 3. DDL — App 2 / App 3 domain

Column names follow the PDF exactly (§3.2.3.1), because these are the tables Bosch named explicitly and there is no benefit to renaming them.

```sql
CREATE TYPE parcel_status AS ENUM ('STORED','IN_TRANSIT','DELIVERED');
CREATE TYPE location_type AS ENUM ('RACK','TROLLEY','STAGING');

CREATE TABLE tbl_storage_locations (
  location_id         VARCHAR(40) PRIMARY KEY,   -- 'RACK-A-04' — the QR value
  location_type       location_type NOT NULL,
  assigned_department VARCHAR(40),               -- NULL = general
  is_occupied         BOOLEAN NOT NULL DEFAULT FALSE,
  display_name        VARCHAR(120)               -- 'Rack A · Level 05'
);

CREATE TABLE tbl_parcels (
  tracking_id          VARCHAR(60) PRIMARY KEY,
  carrier              VARCHAR(40) NOT NULL,
  sap_po_number        VARCHAR(20),
  recipient_name       VARCHAR(120),
  recipient_department VARCHAR(40),              -- added: powers dashboard grouping
  recipient_email      VARCHAR(160),             -- added: resolved at registration
  proposed_location    VARCHAR(40) REFERENCES tbl_storage_locations(location_id),
  actual_location      VARCHAR(40),
  status               parcel_status NOT NULL,
  source_system        VARCHAR(40) NOT NULL DEFAULT 'INBOUND_APP',
                                                 -- 'INBOUND_APP' | 'MILKRUN' | 'INTERNAL_TRANSFER'
  timestamp_last_event TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parcels_status  ON tbl_parcels(status);
CREATE INDEX idx_parcels_carrier ON tbl_parcels(carrier);
CREATE INDEX idx_parcels_ts      ON tbl_parcels(timestamp_last_event DESC);
CREATE INDEX idx_parcels_recip   ON tbl_parcels USING gin (recipient_name gin_trgm_ops);

CREATE TABLE parcel_events (
  event_pk    BIGSERIAL PRIMARY KEY,
  tracking_id VARCHAR(60) NOT NULL REFERENCES tbl_parcels(tracking_id),
  kind        VARCHAR(40) NOT NULL,  -- SCANNED, RECIPIENT_RESOLVED, LOCATION_PROPOSED,
                                      -- LOCATION_VERIFIED, LOCATION_MISMATCH, STORED,
                                      -- EMAIL_SENT, EMAIL_SKIPPED, PICKED_UP
  payload     JSONB,
  actor       VARCHAR(80),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE carrier_formats (
  carrier   VARCHAR(40) PRIMARY KEY,
  pattern   VARCHAR(120) NOT NULL,
  priority  SMALLINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE location_reservations (
  location_id VARCHAR(40) PRIMARY KEY REFERENCES tbl_storage_locations(location_id),
  session_id  VARCHAR(60) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL
);
```

`source_system` is the column that makes Gate G26 possible — it is how a milkrun row is visually distinguished from an App-2 row on the dashboard.

---

## 4. Mock external systems

Real tables behind a real adapter interface, so "how do we point this at the actual SAP?" has a concrete answer: implement `SapAdapter` against the real endpoint, change one environment variable.

```sql
-- System A: SAP_ERP  (§3.2.3.2)
CREATE TABLE mock_sap_orders (
  sap_po_number  VARCHAR(20) PRIMARY KEY,
  recipient_name VARCHAR(120),
  department     VARCHAR(40),
  order_status   VARCHAR(20) NOT NULL
);

-- System B: Bosch_Active_Directory  (§3.2.3.2)
CREATE TABLE mock_directory_users (
  nt_user_id     VARCHAR(20) PRIMARY KEY,
  recipient_name VARCHAR(120) NOT NULL,
  email_address  VARCHAR(160) NOT NULL,
  department     VARCHAR(40)
);
CREATE INDEX idx_ad_name ON mock_directory_users USING gin (recipient_name gin_trgm_ops);

-- SMTP sink
CREATE TABLE mock_emails (
  email_id   BIGSERIAL PRIMARY KEY,
  to_address VARCHAR(160) NOT NULL,
  subject    VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  context    JSONB
);
```

Adapters add a configurable artificial latency (default 250ms) so the loading states are real and visible. A dead-instant "SAP lookup" looks fake; a quarter-second one with a skeleton looks like an integration.

---

## 5. Compatibility views — the PDF's tables, verbatim

```sql
-- §3.1.3.2 — exact column set and order
CREATE VIEW "DB_Shiftbook" AS
SELECT
  t.task_id                        AS log_id,
  t.closed_at                      AS timestamp_resolved,
  t.line_no                        AS line_no,
  t.error_no                       AS error_no,
  t.assignee_user_id               AS resolved_by_user_id,
  COALESCE(so.label, t.solution_free_text) AS solution_selected,
  t.operator_comment               AS operator_comment,
  t.supervisor_user_id             AS supervisor_user_id
FROM tasks t
LEFT JOIN solution_options so ON so.option_id = t.solution_option_id
WHERE t.status IN ('CLOSED','AUTO_CLOSED')
ORDER BY t.closed_at DESC;
```

Verified against §3.1.3.2 sample rows: `5501 | 2026-07-07 09:15:21 | 10 | 70 | 101 | Replaced transport belt motor | NULL | NULL` and `5502 | 2026-07-07 10:05:45 | 31 | 50 | 102 | Cleaned sensor lens / camera | "Sensor was very dusty" | 201`.

Note the internal consistency of their own sample: log 5501 is error **70** on line 10 with `supervisor_user_id` **NULL** (no four-eyes), while 5502 and 5503 are error **50** on line 31 with supervisor **201** present. Our implementation reproduces exactly this pattern, which is a quiet but checkable proof that the four-eyes rule is genuinely conditional.

A `DB_Parcel_Platform` schema containing `tbl_parcels` and `tbl_storage_locations` is created so the fully-qualified name `DB_Parcel_Platform.tbl_parcels` from §3.2.2.2 resolves literally.

---

## 6. Seed data

`pnpm demo:reset` truncates and reseeds everything to this exact state. Run between every rehearsal and immediately before the session (risk R12).

### 6.1 Lines & stations

| line_no | display_name | stations |
|---|---|---|
| 10 | Line 10 — Final Assembly | 20 / Paste Printer, 30 / Pick & Place |
| 31 | Line 31 — SMT Assembly | 20 / Paste Printer, 40 / Reflow Oven |

### 6.2 Skills, error codes, solution options

```
skills:  BARCODE_MAINTENANCE ('Barcode Maintenance')
         TRANSPORT_BELT_MAINTENANCE ('Transport Belt Maintenance')

error_codes:
  '50' | 'Barcode not readable'  | requires_skill NULL                       | four_eyes TRUE
  '70' | 'Transport belt error'  | requires_skill TRANSPORT_BELT_MAINTENANCE | four_eyes FALSE

solution_options:
  50 → 'Cleaned sensor lens / camera'        (1)
       'Replaced barcode scanner hardware'   (2)
       'Adjusted scanner position / angle'   (3)
       'Other'                               (4, is_other)
  70 → 'Removed physical obstruction from belt' (1)
       'Replaced transport belt motor'          (2)
       'Adjusted belt tension'                  (3)
       'Other'                                  (4, is_other)
```

### 6.3 Users (§3.1.3.3, with IDs reconciled to §3.1.3.2)

The PDF's staff table gives names but no IDs; its shiftbook sample uses IDs 101, 102, 103 and 201. §3.1.3.2 says *"the ID values provided in the example are for illustrative purposes only… adapt them so the logic best suits your platform."* We reconcile them:

| user_id | display_name | role | lines | skills | email | on shift |
|---|---|---|---|---|---|---|
| 101 | John Doe | TECHNICIAN | 10 | Transport Belt Maintenance | john.doe@bosch.com | ✓ |
| 102 | Jane Smith | TECHNICIAN | 10, 31 | Barcode Maintenance | jane.smith@bosch.com | ✓ |
| 103 | Alice Wonder | TECHNICIAN | 31 | Transport Belt, Barcode | alice.w@bosch.com | ✓ |
| 201 | Bob Builder | SUPERVISOR | 10, 31 | Transport Belt, Barcode | bob.builder@bosch.com | ✓ |

This mapping makes their sample shiftbook rows internally consistent: 5501 (line 10, error 70, resolved by 101) — John Doe is on line 10 and holds the belt skill ✓. 5502/5503 (line 31, error 50, resolved by 102/103, supervisor 201) — both are on line 31, Bob supervises both lines ✓. Worth pointing out if they check.

### 6.4 Shiftbook history

Seeded verbatim from §3.1.3.2 (log_ids 5501–5503), plus ~20 additional historical entries spread over 60 days so the AI's *"what did others do last time?"* and the solution-frequency annotations have real material.

### 6.5 Storage locations

Exactly §3.2.3.1 Table B (`RACK-A-04` occupied, `RACK-A-05` vacant, `RACK-C-12` occupied, `RACK-C-13` vacant, `TROLLEY-01`), extended with:

| location_id | type | department | occupied |
|---|---|---|---|
| RACK-A-06 | RACK | MOE/LOG-A | FALSE |
| RACK-B-01 | RACK | MOE/ENG-2 | TRUE |
| RACK-B-02 | RACK | MOE/ENG-2 | TRUE |
| RACK-C-14 | RACK | NULL | FALSE |
| TROLLEY-02 | TROLLEY | NULL | FALSE |
| LINE_B_STAGING | STAGING | NULL | FALSE |
| LINE_31_STAGING | STAGING | NULL | FALSE |

`RACK-B-01` and `B-02` are both occupied deliberately: PO `4500987655` (Bob Builder, MOE/ENG-2) then has **no vacant department rack** and must fall through to the general rack — which is how Priority 2 gets demonstrated without contriving anything. *(Gate G17)*

### 6.6 Mock external systems

**`mock_sap_orders`** — the three rows from §3.2.3.2 System A verbatim, plus two added to exercise branches the PDF's own data cannot reach:

| sap_po_number | recipient_name | department | order_status | source |
|---|---|---|---|---|
| 4500987654 | John Doe | MOE/LOG-A | ACTIVE | §3.2.3.2 |
| 4500987655 | Bob Builder | MOE/ENG-2 | ACTIVE | §3.2.3.2 |
| 4500111222 | Sarah Connor | MOE/MFG-P | COMPLETED | §3.2.3.2 |
| 4500222333 | Alice Wonderland | NULL | ACTIVE | added — proves the NULL-department fallback (§3.2.4 B.1 states the department *"could be NULL"*) |
| 4500333444 | NULL | MOE/LOG-A | ACTIVE | added — proves the NULL-recipient case (§3.2.4 B.1 states the recipient *"could be a person, a department, or NULL"*) |

**`mock_directory_users`** — the four rows from §3.2.3.2 System B verbatim:

| nt_user_id | recipient_name | email_address | department |
|---|---|---|---|
| DOE2AN | John Doe | john.doe@bosch.com | MOE/LOG-A |
| BUI4AN | Bob Builder | bob.builder@bosch.com | MOE/ENG-2 |
| CON1AN | Sarah Connor | sarah.connor@bosch.com | MOE/MFG-P |
| WON5AN | Alice Wonderland | alice.w@bosch.com | MOE/LOG-A |

Plus an alias row mapping **"Alice Wonder"** (the §3.1.3.3 spelling) to `WON5AN`, so either spelling resolves — see `08-QUESTIONS-FOR-BOSCH.md` Q7.

**`mock_emails`** starts empty and is truncated by `demo:reset`.

### 6.7 Parcels

The three rows from §3.2.3.1 verbatim, plus ~120 generated records per `04-APP3-DASHBOARD.md` §7 — carriers distributed, ~35 milkrun rows, realistic working-hour timestamp clustering, one parcel deliberately aged 4 days.

### 6.8 Carrier formats

| carrier | pattern | priority |
|---|---|---|
| DHL | `^JD[0-9]{16}$` | 10 |
| UPS | `^1Z[A-Z0-9]{16}$` | 20 |
| Amazon | `^TBA[0-9]{12}$` | 30 |
| GLS | `^[0-9]{12}$` | 40 |

These four are fully anchored and mutually exclusive, so priority does not affect their outcome. `priority` exists so that any pattern **added live** during the demo cannot shadow a specified one; new patterns default to priority 100+. A CI test asserts mutual exclusivity across all active patterns.

---

## 7. Integrity, transactions & realtime

- **Registration finalisation** is one transaction: INSERT parcel → UPDATE `is_occupied` (RACK locations only — see `03-APP2-INBOUND.md` §7 deviation D9) → INSERT parcel_events → release reservation → enqueue email. All or nothing.
- **Task acceptance** uses a conditional update (`UPDATE tasks SET assignee=… WHERE task_id=… AND status='OFFERED'`) and a zero-row result means someone else won — the client renders "Already taken by …". Genuinely race-safe, not optimistically assumed.
- **Auto-archive** runs inside the ingest transaction so a task cannot be created and archived out of order.
- `NOTIFY parcels_changed` / `NOTIFY tasks_changed` triggers on INSERT/UPDATE feed the SSE hub.
- `mock_emails` is written by the SMTP adapter in the same logical step, so the demo inbox is never out of sync with the parcel record.
- Every table with mutable state has an accompanying append-only events table. Nothing important is only knowable by inference.
