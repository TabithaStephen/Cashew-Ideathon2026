'use client';
import { useApi } from './client';
import type { Org, Role, ScenarioId } from './types';

export interface Me {
  session: { role: Role; orgId: string } | null; org: Org | null; scenario: ScenarioId; speed: number; epoch: number; clockOffsetMs: number;
  scenarioExporter: string; orgs: { id: string; type: string; shortName: string; legalName: string; kind?: string }[];
}
export const useMe = () => useApi<Me>('/api/orgs/me', 3000);
export const homeFor = (role?: Role) => (role === 'lender' ? '/lender' : role === 'ops' ? '/ops' : role === 'exporter' ? '/app' : '/');
