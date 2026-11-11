import { describe, expect, it } from "vitest";
import { calendarDays, mondayFirstWeekdayIndex } from "./tripTime";

describe("calendarDays", () => {
  it("starts on the given Paris date, not the previous UTC day", () => {
    expect(calendarDays("2026-11-11", 3)).toEqual(["2026-11-11", "2026-11-12", "2026-11-13"]);
  });

  it("crosses month and year boundaries", () => {
    expect(calendarDays("2026-12-30", 4)).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("keeps one entry per day across the end of daylight saving time", () => {
    expect(calendarDays("2026-10-24", 3)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
  });
});

describe("mondayFirstWeekdayIndex", () => {
  it("puts Monday first and Sunday last", () => {
    expect(mondayFirstWeekdayIndex("2026-11-09")).toBe(0); // lundi
    expect(mondayFirstWeekdayIndex("2026-11-11")).toBe(2); // mercredi
    expect(mondayFirstWeekdayIndex("2026-11-15")).toBe(6); // dimanche
  });
});
