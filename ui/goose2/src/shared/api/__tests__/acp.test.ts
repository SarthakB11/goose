import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadSession = vi.fn();
const mockNewSession = vi.fn();
const mockSetProvider = vi.fn();

vi.mock("../acpApi", () => ({
  listProviders: vi.fn(),
  prompt: vi.fn(),
  setModel: vi.fn(),
  setProvider: (...args: unknown[]) => mockSetProvider(...args),
  listSessions: vi.fn(),
  loadSession: (...args: unknown[]) => mockLoadSession(...args),
  newSession: (...args: unknown[]) => mockNewSession(...args),
  exportSession: vi.fn(),
  importSession: vi.fn(),
  forkSession: vi.fn(),
  cancelSession: vi.fn(),
}));

vi.mock("../acpNotificationHandler", () => ({
  setActiveMessageId: vi.fn(),
  clearActiveMessageId: vi.fn(),
}));

vi.mock("../sessionSearch", () => ({
  searchSessionsViaExports: vi.fn(),
}));

describe("acpLoadSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("restores the prior session mapping when replay loading fails", async () => {
    mockLoadSession.mockRejectedValueOnce(new Error("load failed"));

    const sessionTracker = await import("../acpSessionTracker");
    const { acpLoadSession } = await import("../acp");

    sessionTracker.registerSession(
      "local-session",
      "goose-session-1",
      "goose",
      "/tmp/original",
    );

    await expect(
      acpLoadSession("local-session", "goose-session-2", "/tmp/replay"),
    ).rejects.toThrow("load failed");

    expect(sessionTracker.getGooseSessionId("local-session")).toBe(
      "goose-session-1",
    );
    expect(sessionTracker.getLocalSessionId("goose-session-1")).toBe(
      "local-session",
    );
    expect(sessionTracker.getLocalSessionId("goose-session-2")).toBeNull();
  });

  it("creates a known-new session without probing load or resetting provider", async () => {
    mockNewSession.mockResolvedValueOnce({ sessionId: "goose-session-1" });

    const sessionTracker = await import("../acpSessionTracker");
    const { acpPrepareSession } = await import("../acp");

    await expect(
      acpPrepareSession("local-session", "openai", "/tmp/project", {
        projectId: "project-1",
        knownNew: true,
      }),
    ).resolves.toBe("goose-session-1");

    expect(mockLoadSession).not.toHaveBeenCalled();
    expect(mockNewSession).toHaveBeenCalledWith(
      "/tmp/project",
      "openai",
      "project-1",
      undefined,
    );
    expect(mockSetProvider).not.toHaveBeenCalled();
    expect(sessionTracker.getGooseSessionId("local-session")).toBe(
      "goose-session-1",
    );
  });
});
