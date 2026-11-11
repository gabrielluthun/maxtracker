import { describe, expect, it } from "vitest";
import { buildSncfConnectUrl, tripConnectUrl } from "./sncfConnect";

// Valeurs de référence produites par back/app/services/sncf/connect.py.
describe("buildSncfConnectUrl", () => {
  it("builds the /redirect link from transporter codes", () => {
    expect(
      buildSncfConnectUrl({
        origine_iata: "FRPLY",
        destination_iata: "FRLPE",
        date: "2026-11-11",
        heure_depart: "07:00",
      })
    ).toBe(
      "https://www.sncf-connect.com/redirect?nb_pax=1&origin_transporter_code=FRPLY" +
        "&destination_transporter_code=FRLPE&redirection_type=SEARCH&branch=SHOP" +
        "&outward_date=2026-11-11-07-00"
    );
  });

  it("pads single-digit hours like the backend", () => {
    const url = buildSncfConnectUrl({
      origine_iata: "FRPNO",
      destination_iata: "FRLLE",
      date: "2026-06-20",
      heure_depart: "6:05",
    });
    expect(url).toContain("outward_date=2026-06-20-06-05");
  });

  it("falls back to a text search without transporter codes", () => {
    expect(
      buildSncfConnectUrl({
        origine: "PARIS (intramuros)",
        destination: "LILLE (intramuros)",
        date: "2026-06-20",
        heure_depart: "08:15",
      })
    ).toBe(
      "https://www.sncf-connect.com/app/home/search?q=" +
        "PARIS+%28intramuros%29+LILLE+%28intramuros%29+le+20+juin+2026+%C3%A0+08h15"
    );
  });
});

describe("tripConnectUrl", () => {
  it("prefers the URL sent by the server", () => {
    expect(tripConnectUrl({ sncf_connect_url: "https://example.test/x" })).toBe(
      "https://example.test/x"
    );
  });
});
