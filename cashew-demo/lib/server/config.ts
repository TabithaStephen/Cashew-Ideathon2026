// Demo-only secrets. These are fixed constants so the signed chain survives restarts: nothing real is protected by them.
import { keyFromSeed } from '@/lib/engines/registry';

export const REGISTRY_SALT = 'cashew-demo-salt-v1';
export const registryKeys = keyFromSeed('5f0d1c9a3e7b264880aa17c3de92b64f10e7c6d5a4b3928170f6e5d4c3b2a190');
export const passportKeys = keyFromSeed('a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00');

// Raw 32-byte public key: the last 32 bytes of the SPKI encoding.
export const passportPublicKeyB64 = (passportKeys.publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32).toString('base64');
