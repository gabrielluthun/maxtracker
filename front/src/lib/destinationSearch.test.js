import { describe, expect, it } from "vitest";
import {
  filterGroupsByDestination,
  groupMatchesDestination,
  normalizeSearchText,
} from "./destinationSearch";

const groups = [
  { destination_city: "Lyon", destinations: ["LYON (intramuros)", "LYON ST EXUPERY TGV."] },
  { destination_city: "ST PIERRE DES CORPS", destinations: ["ST PIERRE DES CORPS"] },
  { destination_city: "AIX EN PROVENCE TGV", destinations: ["AIX EN PROVENCE TGV"] },
  { destination_city: "ANGOULEME", destinations: ["ANGOULEME"] },
];

describe("normalizeSearchText", () => {
  it("ignores case, accents, hyphens and 'saint' spellings", () => {
    expect(normalizeSearchText("  Saint-Pierre-des-Corps ")).toBe("st pierre des corps");
    expect(normalizeSearchText("Angoulême")).toBe("angouleme");
    expect(normalizeSearchText("Sainte-Foy")).toBe("ste foy");
  });
});

describe("groupMatchesDestination", () => {
  it("matches the city or any of its stations", () => {
    expect(groupMatchesDestination(groups[0], "exupéry")).toBe(true);
    expect(groupMatchesDestination(groups[1], "saint pierre")).toBe(true);
    expect(groupMatchesDestination(groups[3], "Angoulême")).toBe(true);
    expect(groupMatchesDestination(groups[2], "lyon")).toBe(false);
  });
});

describe("filterGroupsByDestination", () => {
  it("returns every group for an empty query", () => {
    expect(filterGroupsByDestination(groups, "  ")).toBe(groups);
  });

  it("keeps matching groups in order", () => {
    expect(filterGroupsByDestination(groups, "tgv").map((g) => g.destination_city)).toEqual([
      "Lyon",
      "AIX EN PROVENCE TGV",
    ]);
  });
});
