import { STATUS_DISPLAY } from '@/lib/ui';

/** The single most useful action for the newest live trade. */
export function nextStep(trade: any): { text: string; action?: string; href?: string } {
  const open = `/app/trades/${trade.id}`;
  switch (trade.status) {
    case 'DRAFT': return { text: 'Add your documents and run the checks.', action: 'Continue', href: `/app/trades/new?trade=${trade.id}` };
    case 'SUBMITTED':
    case 'VERIFYING': return { text: 'The checks are running.', action: 'Watch the checks', href: `${open}?tab=verification` };
    case 'NEEDS_INFO': return trade.openCases.some((c: any) => c.reason === 'Possible duplicate') ? { text: 'A reviewer is looking at a possible duplicate.', action: 'See the check', href: `${open}?tab=verification` } : { text: 'A check needs your attention before lenders can see this trade.', action: 'Fix it', href: `/app/trades/new?trade=${trade.id}` };
    case 'VERIFIED': return { text: 'Share this trade with lenders to get offers.', action: 'Review and share', href: `/app/trades/new?trade=${trade.id}` };
    case 'OFFERS_OPEN': return { text: `${trade.offerCount} ${trade.offerCount === 1 ? 'offer' : 'offers'} received. Compare what each one costs you.`, action: 'Compare offers', href: `${open}?tab=offers` };
    case 'OFFER_ACCEPTED': return { text: 'Sign the contract to receive the money.', action: 'Continue to e-sign', href: `${open}?tab=offers` };
    case 'CONTRACT_SIGNED': return { text: trade.commitBlocked ? 'The lender’s commit was blocked by the registry.' : 'The lender is committing the financing.', action: 'See financing', href: `${open}?tab=financing` };
    case 'FINANCED':
    case 'SHIPMENT_IN_TRANSIT': return { text: 'Financed. Confirm milestones as the goods move.', action: 'Track shipment', href: `${open}?tab=tracking` };
    case 'DELIVERED':
    case 'BUYER_ACCEPTED': return { text: 'Delivered. Repayment comes when the buyer pays.', action: 'See financing', href: `${open}?tab=financing` };
    case 'REPAID':
    case 'CLOSED': return { text: 'Repaid. This trade now counts on your Passport.', action: 'Open Passport', href: '/app/passport' };
    case 'REJECTED_VERIFICATION': return { text: 'This invoice can’t be financed: the registry blocked it.', action: 'See why', href: `${open}?tab=verification` };
    default: return { text: STATUS_DISPLAY[trade.status as keyof typeof STATUS_DISPLAY].label };
  }
}
