import { describe, it, expect } from "vitest";
import type { AlprDetection } from "@/api/alpr";
import { selectLeg } from "../AlprDetectionsTable";

function detection(overrides: Partial<AlprDetection> = {}): AlprDetection {
  return {
    id: "d1",
    license_plate: "76482R",
    direction: null,
    entry_time: null,
    exit_time: null,
    entry_plate_number: "ENTRY-PLATE",
    entry_plate_image_url: "entry-plate.jpg",
    entry_vehicle_image_url: "entry-vehicle.jpg",
    entry_stream_name: "ANPR ENTRY",
    exit_plate_number: "EXIT-PLATE",
    exit_plate_image_url: "exit-plate.jpg",
    exit_vehicle_image_url: "exit-vehicle.jpg",
    exit_stream_name: "ANPR EXIT",
    ...overrides,
  } as AlprDetection;
}

describe("selectLeg", () => {
  it("uses the row's own direction on the overview route (filter says 'all')", () => {
    // Regression: overview passed direction="all", so `isExit` was false and
    // every row rendered ENTRY media — including exit events.
    const leg = selectLeg(detection({ direction: "exit" }), false);

    expect(leg.plateImage).toBe("exit-plate.jpg");
    expect(leg.vehicleImage).toBe("exit-vehicle.jpg");
    expect(leg.plateNumber).toBe("EXIT-PLATE");
    expect(leg.streamName).toBe("ANPR EXIT");
  });

  it("selects the entry leg for an entry row", () => {
    const leg = selectLeg(detection({ direction: "entry" }), false);

    expect(leg.plateImage).toBe("entry-plate.jpg");
    expect(leg.vehicleImage).toBe("entry-vehicle.jpg");
    expect(leg.plateNumber).toBe("ENTRY-PLATE");
    expect(leg.streamName).toBe("ANPR ENTRY");
  });

  it("matches direction case-insensitively", () => {
    expect(selectLeg(detection({ direction: "EXIT" }), false).plateImage).toBe(
      "exit-plate.jpg",
    );
  });

  it("falls back to the route filter when the row has no direction", () => {
    expect(selectLeg(detection({ direction: null }), true).plateImage).toBe(
      "exit-plate.jpg",
    );
    expect(selectLeg(detection({ direction: null }), false).plateImage).toBe(
      "entry-plate.jpg",
    );
  });

  it("falls back to the opposite leg when the requested side has no media", () => {
    // Events ingested before the edge pipeline was fixed only have one leg.
    const leg = selectLeg(
      detection({
        direction: "exit",
        exit_plate_image_url: null,
        exit_vehicle_image_url: null,
      }),
      false,
    );

    expect(leg.plateImage).toBe("entry-plate.jpg");
    expect(leg.vehicleImage).toBe("entry-vehicle.jpg");
  });

  it("returns null when neither leg has media rather than inventing a value", () => {
    const leg = selectLeg(
      detection({
        direction: "exit",
        entry_plate_image_url: null,
        exit_plate_image_url: null,
      }),
      false,
    );

    expect(leg.plateImage).toBeNull();
  });
});
