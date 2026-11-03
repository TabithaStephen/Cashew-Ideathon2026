export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { ApiError, uploadDocument } from '@/lib/service';
import type { DocType } from '@/lib/types';

export const POST = handle(async (s, sess, req) => {
  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError(400, 'BAD_REQUEST', 'Send multipart/form-data with "file" and "type".');
  const file = form.get('file');
  const type = String(form.get('type') ?? '') as DocType;
  if (!file || typeof file === 'string') throw new ApiError(400, 'BAD_REQUEST', 'No file attached.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = uploadDocument(s, sess, seg(req, 'trades'), { type, fileName: file.name || `${type}.pdf`, bytes, amended: form.get('amended') === 'true' });
  return doc;
});
