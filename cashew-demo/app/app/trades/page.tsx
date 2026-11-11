'use client';

import { PageHead, Rows, TradesTable } from '@/components/app/parts';
import { useApi } from '@/lib/client/api';

export default function TradesPage() {
  const { data } = useApi<any>('trades');
  return (
    <>
      <PageHead title="Trades" intro="Every trade on this account, newest first." />
      {data ? <TradesTable trades={data.trades} /> : <Rows />}
    </>
  );
}
