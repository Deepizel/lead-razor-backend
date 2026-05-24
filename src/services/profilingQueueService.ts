import { env } from "../config/env";
import { refreshLeadSnapshot } from "./snapshotService";

/** Async LLM profiling after upload or manual lead create */
export function queueLeadProfiling(userId: string, leadIds: string[]): number {
  if (!env.openaiApiKey || leadIds.length === 0) return 0;

  for (const leadId of leadIds) {
    setImmediate(() => {
      refreshLeadSnapshot(leadId, { userId }).catch((err) => {
        console.error(`Profiling failed for lead ${leadId}:`, err);
      });
    });
  }

  return leadIds.length;
}
