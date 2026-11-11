// Every path in Blueprint Section 12 is served from one dispatcher: see lib/api/router.ts.
import { dispatch } from '@/lib/api/router';

export const dynamic = 'force-dynamic';

type Ctx = { params: { path: string[] } };
const handler = (req: Request, { params }: Ctx) => dispatch(req, params.path);

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
