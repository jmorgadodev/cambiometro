export interface HomeMetric {
  key: string;
  value: number;
  label: string;
  tooltip: string;
  href: string;
}

export interface HomeMovementSummary {
  total: number;
  renuncias: number;
  verificados: number;
  enConfirmacion: number;
  diasSinCambios: number;
  desde: string;
  ultimoEvento: string;
}

export interface HomeVote {
  id: string;
  date: string;
  bulletin: string;
  title: string;
  summary: string;
  chamber: string;
  result: string;
}

export interface HomeSource {
  id: string;
  name: string;
  organization: string;
  recordCount: number;
  frequency: string;
  status: string;
  statusText: string;
  viewLink: string;
}
