import crypto from 'crypto';

/**
 * Zego Token04 generator (server-side).
 * Compatible with ZegoUIKitPrebuilt.generateKitTokenForProduction.
 * Based on Zego's published Token04 algorithm.
 */
export function generateZegoToken04(
  appId: number,
  userId: string,
  serverSecret: string,
  effectiveTimeInSeconds: number = 3600,
  payload: string = ''
): string {
  if (!appId || typeof appId !== 'number') {
    throw new Error('appId must be a number');
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a string');
  }
  if (!serverSecret || typeof serverSecret !== 'string' || serverSecret.length !== 32) {
    throw new Error('serverSecret must be a 32-character string');
  }

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: Math.floor(Math.random() * 2147483647),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload,
  };

  const plainText = JSON.stringify(tokenInfo);
  const iv = makeRandomIv();
  const encryptBuf = aesEncrypt(plainText, serverSecret, iv);

  const bytes1 = new Uint8Array(8);
  const bytes2 = new Uint8Array(2);
  const bytes3 = new Uint8Array(2);

  bytes1.set(int64ToBytes(tokenInfo.expire));
  bytes2.set(int16ToBytes(iv.length));
  bytes3.set(int16ToBytes(encryptBuf.length));

  const buffer = Buffer.concat([
    Buffer.from(bytes1),
    Buffer.from(bytes2),
    Buffer.from(iv),
    Buffer.from(bytes3),
    Buffer.from(encryptBuf),
  ]);

  return '04' + buffer.toString('base64');
}

function makeRandomIv(): string {
  const str = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += str[Math.floor(Math.random() * str.length)];
  }
  return result;
}

function aesEncrypt(plainText: string, key: string, iv: string): Buffer {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
}

function int64ToBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = n % 256;
    n = Math.floor(n / 256);
  }
  return bytes;
}

function int16ToBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(2);
  bytes[0] = n % 256;
  bytes[1] = Math.floor(n / 256);
  return bytes;
}
