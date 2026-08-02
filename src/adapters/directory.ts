/**
 * System B — Bosch_Active_Directory adapter (PDF §3.2.3.2).
 *
 * Real interface, mock implementation reading `mock_directory_users`. Name
 * matching (including the "Alice Wonder" / "Alice Wonderland" alias case,
 * docs/08-QUESTIONS-FOR-BOSCH.md Q7) is a business decision, so it is
 * delegated to `findDirectoryUser` in src/engine — this adapter only fetches
 * rows and shapes them; it never re-implements the matching rule itself
 * (CLAUDE.md rule 2).
 */

import { db } from '../db/client';
import { mockDirectoryUsers } from '../db/schema';
import type { DirectoryUser } from '../engine/types';
import { findDirectoryUser } from '../engine/recipient-resolution';
import { adapterLatency } from './latency';

export interface DirectoryAdapter {
  /** Returns null when no person matches — a normal outcome, not an error. */
  findByName(name: string): Promise<DirectoryUser | null>;
  /** Type-ahead over known names — a UI convenience, not a business rule. */
  search(query: string, limit?: number): Promise<DirectoryUser[]>;
  all(): Promise<DirectoryUser[]>;
}

function toDirectoryUser(row: typeof mockDirectoryUsers.$inferSelect): DirectoryUser {
  return {
    ntUserId: row.ntUserId,
    recipientName: row.recipientName,
    emailAddress: row.emailAddress,
    department: row.department,
    aliases: row.aliases ? (JSON.parse(row.aliases) as string[]) : undefined,
  };
}

function loadAll(): DirectoryUser[] {
  return db.select().from(mockDirectoryUsers).all().map(toDirectoryUser);
}

export function createMockDirectoryAdapter(): DirectoryAdapter {
  return {
    async findByName(name: string): Promise<DirectoryUser | null> {
      await adapterLatency();
      return findDirectoryUser(name, loadAll());
    },

    async search(query: string, limit = 8): Promise<DirectoryUser[]> {
      await adapterLatency();
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return loadAll()
        .filter((u) => u.recipientName.toLowerCase().includes(q))
        .slice(0, limit);
    },

    async all(): Promise<DirectoryUser[]> {
      await adapterLatency();
      return loadAll();
    },
  };
}

export const directoryAdapter: DirectoryAdapter = createMockDirectoryAdapter();
