import { describe, expect, test } from "bun:test";
import { transferDeadlineState } from "../src/lib/cpgrams/transfer-deadline";

describe("wrong-routing transfer deadline", () => {
  test("reports the deterministic 48-hour window without waiting in real time", () => {
    const detectedAt = "2026-08-26T04:30:00.000Z";
    const dueAt = "2026-08-28T04:30:00.000Z";
    const status = transferDeadlineState(
      detectedAt,
      dueAt,
      null,
      new Date("2026-08-27T02:30:00.000Z"),
    );

    expect(new Date(dueAt).getTime() - new Date(detectedAt).getTime()).toBe(48 * 60 * 60 * 1000);
    expect(status).toEqual({ pending: true, overdue: false, remainingLabel: "26 hours remaining" });
  });

  test("distinguishes overdue and satisfied routing requirements", () => {
    expect(
      transferDeadlineState(
        "2026-08-26T04:30:00.000Z",
        "2026-08-28T04:30:00.000Z",
        null,
        new Date("2026-08-28T06:00:00.000Z"),
      ),
    ).toEqual({ pending: true, overdue: true, remainingLabel: "Overdue by 2 hours" });

    expect(
      transferDeadlineState(
        "2026-08-26T04:30:00.000Z",
        "2026-08-28T04:30:00.000Z",
        "2026-08-27T04:30:00.000Z",
      ),
    ).toEqual({ pending: false, overdue: false, remainingLabel: "Transfer completed" });
    expect(
      transferDeadlineState(
        "2026-08-26T04:30:00.000Z",
        "2026-08-28T04:30:00.000Z",
        null,
        new Date("2026-08-28T04:30:00.000Z"),
      ),
    ).toEqual({ pending: true, overdue: false, remainingLabel: "Due now" });
    expect(transferDeadlineState(null, null, null)).toBeNull();
  });
});
