import { describe, expect, it } from "vitest";
import {
  arrivalDayOffset,
  countNewItems,
  createFilterContext,
  enrichSearchGroups,
  filterPreparedGroups,
  calendarDays,
  formatCountdown,
  isImminentDeparture,
  minutesUntilDeparture,
  mondayFirstWeekdayIndex,
  nextDepartureLabel,
} from "./tripTime";

describe("nextDepartureLabel", () => {
  const today = "2026-11-13"; // un vendredi

  it("picks the earliest departure and says « auj. » for today", () => {
    const trips = [
      { date: "2026-11-14", heure_depart: "07:12:00" },
      { date: "2026-11-13", heure_depart: "20:42:00" },
    ];
    expect(nextDepartureLabel(trips, [], today)).toBe("auj. 20:42");
  });

  it("says « demain » for the next day", () => {
    expect(nextDepartureLabel([{ date: "2026-11-14", heure_depart: "07:12" }], [], today)).toBe("demain 07:12");
  });

  it("uses the short weekday and day number further out", () => {
    expect(nextDepartureLabel([{ date: "2026-11-16", heure_depart: "10:59" }], [], today)).toBe("lun. 16 10:59");
  });

  it("uses connections when there is no direct trip", () => {
    expect(nextDepartureLabel([], [{ date: "2026-11-15", heure_depart: "13:28" }], today)).toBe("dim. 15 13:28");
  });

  it("compares direct trips and connections together", () => {
    const direct = [{ date: "2026-11-15", heure_depart: "18:00" }];
    const connected = [{ date: "2026-11-15", heure_depart: "09:00" }];
    expect(nextDepartureLabel(direct, connected, today)).toBe("dim. 15 09:00");
  });

  it("is null when there is nothing", () => {
    expect(nextDepartureLabel([], [], today)).toBe(null);
  });
});

describe("formatCountdown", () => {
  it("shows minutes under an hour", () => {
    expect(formatCountdown(45)).toBe("Dans 45 min");
  });

  it("shows hours and padded minutes from one hour", () => {
    expect(formatCountdown(60)).toBe("Dans 1 h 00");
    expect(formatCountdown(62)).toBe("Dans 1 h 02");
  });
});

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

describe("selectedDate filter", () => {
  const filters = {
    departureTodayOnly: false,
    weekendOnly: false,
    timeSlots: { morning: true, afternoon: true, evening: true },
    showInoui: true,
    showIntercites: true,
    showIntercitesNuit: true,
    maxConnections: 1,
    maxDurationMinutes: null,
    dateHorizonDays: 30,
    selectedDate: null,
  };
  const { today } = createFilterContext(filters);
  const [y, m, d] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  const later = new Date(Date.UTC(y, m - 1, d + 2)).toISOString().slice(0, 10);
  const trip = (date) => ({ date, heure_depart: "23:59", heure_arrivee: "23:59", train_type: "TGV_INOUI" });
  const groups = enrichSearchGroups([
    { destination_city: "Lyon", trips: [trip(tomorrow), trip(later)], connected_trips: [] },
    { destination_city: "Nice", trips: [trip(later)], connected_trips: [] },
  ]);

  it("keeps only trips of the chosen day and drops empty groups", () => {
    const { groups: out, totalTrips } = filterPreparedGroups(groups, { ...filters, selectedDate: tomorrow }, []);
    expect(out.map((g) => g.destination_city)).toEqual(["Lyon"]);
    expect(totalTrips).toBe(1);
  });

  it("shows every day when no day is selected", () => {
    expect(filterPreparedGroups(groups, filters, []).totalTrips).toBe(3);
  });
});

describe("new trips", () => {
  const filters = {
    departureTodayOnly: false,
    weekendOnly: false,
    newOnly: false,
    timeSlots: { morning: true, afternoon: true, evening: true },
    showInoui: true,
    showIntercites: true,
    showIntercitesNuit: true,
    maxConnections: 1,
    maxDurationMinutes: null,
    dateHorizonDays: 30,
    selectedDate: null,
  };
  const { today } = createFilterContext(filters);
  const [y, m, d] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  const trip = (isNew) => ({ date: tomorrow, heure_depart: "10:00", heure_arrivee: "12:00", train_type: "TGV_INOUI", ...(isNew ? { is_new: true } : {}) });
  const journey = (isNew) => ({ ...trip(isNew), legs: [trip(false), trip(isNew)] });
  const groups = enrichSearchGroups([
    { destination_city: "Lyon", trips: [trip(true), trip(false)], connected_trips: [journey(true)] },
    { destination_city: "Nice", trips: [trip(false)], connected_trips: [journey(false)] },
  ]);

  it("counts new direct trips and journeys", () => {
    expect(countNewItems(groups[0].trips, groups[0].connected_trips)).toBe(2);
    expect(countNewItems(groups[1].trips, groups[1].connected_trips)).toBe(0);
  });

  it("keeps only new items with the newOnly filter", () => {
    const { groups: out, totalTrips } = filterPreparedGroups(groups, { ...filters, newOnly: true }, []);
    expect(out.map((g) => g.destination_city)).toEqual(["Lyon"]);
    expect(totalTrips).toBe(2);
  });
});
