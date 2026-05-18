/**
 * REST data source -- NOT IMPLEMENTED in v0.1.
 *
 * Will call the StockHeartbeat public REST API once the upstream service
 * exposes it (see docs/data-source.md for the planned endpoints). The shape
 * of this file is reserved so tools/server code does not need to change when
 * a real implementation lands.
 */
import { type DataSource } from "./index.js";

export interface RestSourceOptions {
  baseUrl?: string;
  apiKey?: string;
  symbols?: string[];
  windows?: string[];
}

export function createRestSource(_options: RestSourceOptions = {}): DataSource {
  throw new Error(
    "restSource is not implemented in v0.1. " +
      "Track the roadmap in docs/data-source.md.",
  );
}
