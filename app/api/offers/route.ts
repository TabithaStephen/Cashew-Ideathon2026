export const dynamic = 'force-dynamic';
import { body, handle } from '@/lib/api';
import { submitOffer } from '@/lib/service';

export const POST = handle(async (s, sess, req) => submitOffer(s, sess, await body(req)), { roles: ['lender'] });
