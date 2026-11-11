import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  filtersWithDefaults,
  parseSearchState,
  serializeSearchState,
  stationFromRaw,
} from "./urlState";

const paris = stationFromRaw("Paris");

describe("stationFromRaw", () => {
  it("recognises metropolises and SNCF stations", () => {
    expect(paris).toEqual({ raw: "Paris", is_metropolis: true, name: "Paris (toutes gares)" });
    expect(stationFromRaw("LYON PART DIEU")).toEqual({
      raw: "LYON PART DIEU",
      is_metropolis: false,
      name: "Lyon Part Dieu",
    });
  });
});

describe("serializeSearchState", () => {
  it("keeps the URL bare without a station", () => {
    expect(serializeSearchState({ station: null, filters: DEFAULT_FILTERS })).toBe("");
  });

  it("only writes values that differ from the defaults", () => {
    expect(serializeSearchState({ station: paris, filters: DEFAULT_FILTERS })).toBe("?gare=Paris");
  });

  it("writes every non-default value", () => {
    const filters = filtersWithDefaults({
      maxConnections: 1,
      dateHorizonDays: 7,
      maxDurationMinutes: 180,
      departureTodayOnly: true,
      weekendOnly: true,
      newOnly: true,
      timeSlots: { afternoon: false },
      showIntercitesNuit: false,
      selectedDate: "2026-11-14",
    });
    const qs = serializeSearchState({ station: paris, filters, destQuery: " bordeaux ", tab: "calendar" });
    expect(qs).toBe(
      "?gare=Paris&dest=bordeaux&vue=calendrier&corresp=1&horizon=7&duree=180" +
        "&aujourdhui=1&nouveau=1&weekend=1&creneaux=matin%2Csoir&trains=inoui%2Cic&jour=2026-11-14"
    );
  });
});

describe("parseSearchState", () => {
  it("round-trips a serialized state", () => {
    const filters = filtersWithDefaults({ maxConnections: 1, timeSlots: { evening: false }, showInoui: false });
    const state = { station: stationFromRaw("LYON PART DIEU"), filters, destQuery: "nice", tab: "chart" };
    expect(parseSearchState(serializeSearchState(state))).toEqual(state);
  });

  it("falls back to defaults for missing or invalid values", () => {
    const state = parseSearchState("?horizon=99&duree=abc&vue=autre&jour=demain&corresp=2");
    expect(state).toEqual({ station: null, filters: filtersWithDefaults(), destQuery: "", tab: "list" });
  });
});

describe("filtersWithDefaults", () => {
  it("ignores unknown keys and never mutates the defaults", () => {
    const f = filtersWithDefaults({ unknown: 1, timeSlots: { morning: false } });
    expect(f.unknown).toBeUndefined();
    expect(f.timeSlots).toEqual({ morning: false, afternoon: true, evening: true });
    expect(DEFAULT_FILTERS.timeSlots.morning).toBe(true);
  });
});
