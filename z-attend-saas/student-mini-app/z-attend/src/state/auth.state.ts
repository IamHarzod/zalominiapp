import { atom } from 'jotai';

export interface StudentUser {
  id: string;
  zaloUserId: string;
  studentCode: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string;
  role: string;
  status: string;
}

export const accessTokenAtom = atom<string | null>(
  localStorage.getItem('zattend_access_token'),
);

export const tempTokenAtom = atom<string | null>(null);

export const userAtom = atom<StudentUser | null>(null);
