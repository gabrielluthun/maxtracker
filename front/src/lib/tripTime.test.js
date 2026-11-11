import { describe, expect, it } from "vitest";
import {
  arrivalDayOffset,
  calendarDays,
  isImminentDeparture,
  minutesUntilDeparture,
  mondayFirstWeekdayIndex,
} from "./tripTime";

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

describe("isImminentDeparture", () => {
  const lateEvening = { today: "2026-11-11", curTime: "22:30" };

  it("counts minutes in Paris time across midnight", () => {
    expect(minutesUntilDeparture("2026-11-12", "01:00", lateEvening)).toBe(150);
    expect(minutesUntilDeparture("2026-11-11", "22:00", lateEvening)).toBe(-30);
  });

  it("flags departures within the next 4 hours only", () => {
    expect(isImminentDeparture("2026-11-12", "01:00", lateEvening)).toBe(true);
    expect(isImminentDeparture("2026-11-11", "22:00", lateEvening)).toBe(false); // parti
    expect(isImminentDeparture("2026-11-12", "02:30", lateEvening)).toBe(false); // 4 h pile
    expect(isImminentDeparture("2026-11-13", "08:00", lateEvening)).toBe(false);
  });
});

describe("arrivalDayOffset", () => {
  it("detects next-day arrivals from the total duration", () => {
    expect(arrivalDayOffset("22:00", 9 * 60 + 30)).toBe(1); // 22:00 → 07:30
    expect(arrivalDayOffset("07:00", 130)).toBe(0);
    expect(arrivalDayOffset("23:30", 30)).toBe(1); // arrivée à 00:00 pile
    expect(arrivalDayOffset("08:00", null)).toBe(0);
  });
});
