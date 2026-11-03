import { createHash, createPrivateKey, createPublicKey, sign as edSign, verify as edVerify, KeyObject } from 'node:crypto';

export const sha256 = (data: string | Buffer | Uint8Array) => createHash('sha256').update(data).digest('hex');

/** Demo-only constants (server config). Deterministic keys so signatures survive restarts. */
export const REGISTRY_SALT = 'cashew-demo-salt-v1';
const REGISTRY_SEED = createHash('sha256').update('cashew-demo-registry-key').digest();
const PASSPORT_SEED = createHash('sha256').update('cashew-demo-passport-key').digest();

function keyPairFromSeed(seed: Buffer): { priv: KeyObject; pub: KeyObject; pubRaw: Buffer } {
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
  const priv = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  const pub = createPublicKey(priv);
  const spki = pub.export({ format: 'der', type: 'spki' }) as Buffer;
  return { priv, pub, pubRaw: spki.subarray(spki.length - 32) };
}

const registryKeys = keyPairFromSeed(REGISTRY_SEED);
const passportKeys = keyPairFromSeed(PASSPORT_SEED);

export const registryPublicKeyB64 = registryKeys.pubRaw.toString('base64');
export const passportPublicKeyB64 = passportKeys.pubRaw.toString('base64');

export const signRegistry = (msg: string) => edSign(null, Buffer.from(msg), registryKeys.priv).toString('base64');
export const verifyRegistry = (msg: string, sigB64: string) => {
  try { return edVerify(null, Buffer.from(msg), registryKeys.pub, Buffer.from(sigB64, 'base64')); } catch { return false; }
};
export const signPassport = (msg: string) => edSign(null, Buffer.from(msg), passportKeys.priv).toString('base64');
export const verifyPassportServer = (msg: string, sigB64: string) => {
  try { return edVerify(null, Buffer.from(msg), passportKeys.pub, Buffer.from(sigB64, 'base64')); } catch { return false; }
};
