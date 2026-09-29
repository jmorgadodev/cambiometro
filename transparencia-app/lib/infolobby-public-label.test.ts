import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatInfoLobbyEventKind } from "./infolobby-public-label";

describe("InfoLobby public labels", () => {
  it("keeps audiences, trips and gifts distinct without guessing unknown records", () => {
    expect(formatInfoLobbyEventKind("audience")).toBe("Audiencia de lobby");
    expect(formatInfoLobbyEventKind("travel")).toBe("Viaje registrado");
    expect(formatInfoLobbyEventKind("gift")).toBe("Donativo registrado");
    expect(formatInfoLobbyEventKind(null)).toBe("Registro InfoLobby");
    expect(formatInfoLobbyEventKind("other")).toBe("Registro InfoLobby");
  });

  it("does not describe the whole InfoLobby collection as audiences", () => {
    const explorer = readFileSync(resolve("components/cruces/CrucesExplorerClient.tsx"), "utf8");
    const drawer = readFileSync(resolve("components/cruces/CrucesDetailDrawer.tsx"), "utf8");
    const records = readFileSync(resolve("components/cruces/CrucesSourceRecords.tsx"), "utf8");
    expect(explorer).toContain('label: "Registros InfoLobby"');
    expect(drawer).toContain('infolobby: "Registros InfoLobby"');
    expect(records).toContain("formatInfoLobbyEventKind(data.lobby_event_kind)");
  });
});
