export function formatInfoLobbyEventKind(value: unknown): string {
  switch (value) {
    case "audience": return "Audiencia de lobby";
    case "travel": return "Viaje registrado";
    case "gift": return "Donativo registrado";
    default: return "Registro InfoLobby";
  }
}
