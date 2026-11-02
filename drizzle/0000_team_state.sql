CREATE TABLE team_state (
 id INTEGER PRIMARY KEY CHECK(id = 1),
 version INTEGER NOT NULL DEFAULT 0,
 payload TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO team_state(id, version, payload, updated_at)
VALUES(1, 0, '{"tasks":[],"roles":{}}', '2026-11-02T00:00:00.000Z');
