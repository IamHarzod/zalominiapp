import {
  getAccessToken,
  getPhoneNumber,
  scanQRCode,
  getLocation,
  chooseImage,
} from 'zmp-sdk/apis';

export function isRunningInZaloApp(): boolean {
  if (typeof window === 'undefined') return false;
  return /Zalo/i.test(navigator.userAgent) || !!(window as any).ZaloJavaScriptInterface;
}

export async function getZaloAccessTokenSafe(): Promise<string> {
  if (!isRunningInZaloApp()) return 'DEV_sv_web_01';
  try {
    return await getAccessToken({});
  } catch {
    return 'DEV_sv_web_01';
  }
}

export async function getZaloPhoneTokenSafe(): Promise<string> {
  if (!isRunningInZaloApp()) return 'DEV_PHONE_TOKEN';
  try {
    const res = await getPhoneNumber({});
    return res.token || 'DEV_PHONE_TOKEN';
  } catch {
    return 'DEV_PHONE_TOKEN';
  }
}

export async function getZaloLocationTokenSafe(): Promise<{
  locationToken: string;
  devLat?: number;
  devLng?: number;
}> {
  if (!isRunningInZaloApp()) {
    return { locationToken: 'DEV_LOCATION_TOKEN', devLat: 10.7769, devLng: 106.7009 };
  }
  try {
    const res: any = await getLocation({});
    if (res?.token) {
      return { locationToken: res.token };
    }
    return {
      locationToken: 'DEV_LOCATION_TOKEN',
      devLat: Number(res?.latitude || 10.7769),
      devLng: Number(res?.longitude || 106.7009),
    };
  } catch {
    return { locationToken: 'DEV_LOCATION_TOKEN', devLat: 10.7769, devLng: 106.7009 };
  }
}

export async function scanAttendanceQR(): Promise<{
  sessionId: string;
  qrToken: string;
} | null> {
  if (!isRunningInZaloApp()) {
    throw new Error('DESKTOP_BROWSER_MODE');
  }

  const { content } = await scanQRCode({});
  if (!content) return null;

  if (content.startsWith('{')) {
    const parsed = JSON.parse(content);
    return { sessionId: parsed.sessionId, qrToken: parsed.qrToken };
  }
  const [sessionId, qrToken] = content.split('|');
  return { sessionId, qrToken };
}

export async function pickEvidenceImages(): Promise<string[]> {
  try {
    const { filePaths } = await chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
    });
    return filePaths || [];
  } catch {
    return [];
  }
}
