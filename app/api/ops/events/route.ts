export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
import { CHECKS } from '@/lib/engines/verification';

export const GET = handle((s) => ({
  webhooks: [...s.webhooks].reverse().slice(0, 100),
  integrations: [
    ...CHECKS.filter((c) => c.mode === 'staged').map((c) => ({ name: c.source, checks: [c.id], status: 'Simulated, healthy', manualFallback: c.manualFallback })),
    { name: 'e-Sign (OTP)', checks: [], status: 'Simulated, healthy', manualFallback: true },
  ],
}), { roles: ['ops'] });
