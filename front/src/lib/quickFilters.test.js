import { describe, expect, it } from "vitest";
import { filtersWithDefaults } from "./urlState";
import { activeFilterCount, isQuickFilterOn, toggleQuickFilter } from "./quickFilters";

const base = () => filtersWithDefaults();

describe("toggleQuickFilter", () => {
  it("turning today on turns weekend off", () => {
    const f = toggleQuickFilter({ ...base(), weekendOnly: true }, "today");
    expect([f.departureTodayOnly, f.weekendOnly]).toEqual([true, false]);
  });

  it("turning weekend on turns today off", () => {
    const f = toggleQuickFilter({ ...base(), departureTodayOnly: true }, "weekend");
    expect([f.weekendOnly, f.departureTodayOnly]).toEqual([true, false]);
  });

  it("turning today off keeps weekend as it was (old links with both on)", () => {
    const f = toggleQuickFilter({ ...base(), departureTodayOnly: true, weekendOnly: true }, "today");
    expect([f.departureTodayOnly, f.weekendOnly]).toEqual([false, true]);
  });

  it("toggles newOnly", () => {
    expect(toggleQuickFilter(base(), "new").newOnly).toBe(true);
  });

  it("short: null → 180, 180 → null, 300 → 180", () => {
    expect(toggleQuickFilter(base(), "short").maxDurationMinutes).toBe(180);
    expect(toggleQuickFilter({ ...base(), maxDurationMinutes: 180 }, "short").maxDurationMinutes).toBe(null);
    expect(toggleQuickFilter({ ...base(), maxDurationMinutes: 300 }, "short").maxDurationMinutes).toBe(180);
  });

  it("does not mutate its input", () => {
    const f = base();
    toggleQuickFilter(f, "today");
    expect(f.departureTodayOnly).toBe(false);
  });
});

describe("isQuickFilterOn", () => {
  it("short is on only at 180 minutes", () => {
    expect(isQuickFilterOn({ ...base(), maxDurationMinutes: 180 }, "short")).toBe(true);
    expect(isQuickFilterOn({ ...base(), maxDurationMinutes: 300 }, "short")).toBe(false);
  });
});

describe("activeFilterCount", () => {
  it("is 0 for the defaults", () => {
    expect(activeFilterCount(base())).toBe(0);
  });

  it("counts each boolean filter", () => {
    expect(activeFilterCount({ ...base(), weekendOnly: true, newOnly: true })).toBe(2);
  });

  it("counts switched-off time slots once", () => {
    expect(activeFilterCount({ ...base(), timeSlots: { morning: false, afternoon: false, evening: true } })).toBe(1);
  });

  it("counts switched-off train types once", () => {
    expect(activeFilterCount({ ...base(), showInoui: false, showIntercites: false })).toBe(1);
  });

  it("ignores the day picked in the calendar", () => {
    expect(activeFilterCount({ ...base(), selectedDate: "2026-11-14" })).toBe(0);
  });

  it("counts connections and a shorter horizon", () => {
    expect(activeFilterCount({ ...base(), maxConnections: 1, dateHorizonDays: 7 })).toBe(2);
  });
});
