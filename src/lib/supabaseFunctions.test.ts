import { describe, expect, it, vi } from "vitest";
import { deleteUserAccount } from "./supabaseFunctions";

describe("deleteUserAccount", () => {
  it("falls back to local cleanup when the edge function fails", async () => {
    const deleteCalls: string[][] = [];

    const from = vi.fn((table: string) => ({
      delete: () => {
        deleteCalls.push([table, "delete"]);
        return Promise.resolve({ error: null });
      },
      update: () => Promise.resolve({ error: null }),
    }));

    const functions = {
      invoke: vi.fn().mockResolvedValue({ data: { error: "Edge failed" }, error: null }),
    };

    const auth = {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "token" } },
        error: null,
      }),
    };

    const supabase = { auth, functions, from } as any;

    const result = await deleteUserAccount(supabase, "user-123");

    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(deleteCalls).toEqual([
      ["user_roles", "delete"],
      ["profiles", "delete"],
    ]);
  });
});
