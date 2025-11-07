
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Source {
  id: number;
  citation: string;
  summary?: SourceSummary;
}

export interface SourceSummary {
  rawResponse: string;
  groundingSources?: GroundingSource[];
}
