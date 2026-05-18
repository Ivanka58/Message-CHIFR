export interface HealthStatus {
  status: string;
}

export interface LoginInput {
  phone: string;
}

export interface AuthCodeResponse {
  message: string;
  code: string;
}

export interface VerifyInput {
  phone: string;
  code: string;
}

export interface AuthSession {
  sessionId: string;
  userId: number;
  name: string;
  phone: string;
  avatar?: string | null;
}

export interface User {
  id: number;
  phone: string;
  name: string;
  avatar?: string | null;
  isOnline: boolean;
  lastSeen?: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  avatar?: string;
}

export interface Message {
  id: number;
  fromUserId: number;
  toUserId: number;
  text: string;
  encryptedText?: string | null;
  timestamp: string;
  isEncrypted: boolean;
  readAt?: string | null;
  editedAt?: string | null;
  fromName?: string | null;
}

export interface MessageInput {
  toUserId: number;
  text: string;
}

export interface MessageStats {
  totalSent: number;
  totalReceived: number;
  encryptedCount: number;
  contactCount: number;
}

export interface UnsubscribePushInput {
  endpoint: string;
}

export interface PushSubscriptionInputKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: PushSubscriptionInputKeys;
}

export interface AdminUser {
  id: number;
  phone: string;
  name: string;
  messageCount: number;
  createdAt: string;
}

export interface GetVapidPublicKey200 {
  publicKey: string;
}
