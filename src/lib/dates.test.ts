import { describe, expect, it } from "vitest";
import { addDaysIso, formatDate, todayIso } from "./dates";

describe("todayIso", () => {
  it("returns the local calendar date as YYYY-MM-DD", () => {
    expect(todayIso(new Date(2026, 8, 28, 23, 59, 59))).toBe("2026-09-28");
    expect(todayIso(new Date(2026, 8, 28, 0, 0, 0))).toBe("2026-09-28");
  });

  it("zero-pads month and day", () => {
    expect(todayIso(new Date(2027, 0, 5))).toBe("2027-01-05");
  });

  it("defaults to the current date", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDaysIso", () => {
  it.each([
    ["2026-09-28", 0, "2026-09-28"],
    ["2026-09-28", 14, "2026-10-12"],
    ["2026-12-25", 10, "2027-01-04"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-02-29", 365, "2029-02-28"],
    ["2026-03-01", -1, "2026-02-28"],
  ])("%s + %i days = %s", (date, days, expected) => {
    expect(addDaysIso(date, days)).toBe(expected);
  });
});

describe("formatDate", () => {
  it.each([
    ["2027-01-04", "04 Jan 2027"],
    ["2028-02-29", "29 Feb 2028"],
    ["2026-06-01", "01 Jun 2026"],
  ])("formats %s as %s", (date, expected) => {
    expect(formatDate(date)).toBe(expected);
  });

  // Regression: en-GB Intl data (CLDR 48) abbreviates September as "Sept".
  it("abbreviates September as Sep like every other month", () => {
    expect(formatDate("2026-09-28")).toBe("28 Sep 2026");
  });

  it("returns malformed input unchanged", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
