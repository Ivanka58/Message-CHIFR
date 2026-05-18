import type {
  AuthSession,
  AuthCodeResponse,
  User,
  UpdateProfileInput,
  Message,
  MessageInput,
  MessageStats,
  PushSubscriptionInput,
  AdminUser,
  GetVapidPublicKey200,
  LoginInput,
  VerifyInput,
} from "./api-types";

export type { AuthSession, User, Message, MessageStats, AdminUser };

export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;
export type BodyType<T> = T;
export type AuthTokenGetter = () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;

export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  if (!url.startsWith("/")) return input;
  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();
  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => { headers.set(key, value); });
  }
  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType === "application/xml" ||
        mediaType === "text/xml" ||
        mediaType.endsWith("+xml") ||
        mediaType === "application/x-www-form-urlencoded"),
  );
}

function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;
  if (typeof data === "string") {
    const text = data.trim();
    return text ? `${prefix}: ${truncate(text)}` : prefix;
  }
  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message =
    getStringField(data, "message") ??
    getStringField(data, "error_description") ??
    getStringField(data, "error");
  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;
  return prefix;
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;

  constructor(response: Response, data: T | null, requestInfo: { method: string; url: string }) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
  readonly rawBody: string;
  readonly cause: unknown;

  constructor(response: Response, rawBody: string, cause: unknown, requestInfo: { method: string; url: string }) {
    super(`Failed to parse response from ${requestInfo.method} ${response.url || requestInfo.url} (${response.status} ${response.statusText}) as JSON`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
    this.rawBody = rawBody;
    this.cause = cause;
  }
}

async function parseJsonBody(response: Response, requestInfo: { method: string; url: string }): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);
  if (normalized.trim() === "") return null;
  try {
    return JSON.parse(normalized);
  } catch (cause) {
    throw new ResponseParseError(response, raw, cause, requestInfo);
  }
}

async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) return null;
  const mediaType = getMediaType(response.headers);
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function" ? response.blob() : response.text();
  }
  const raw = await response.text();
  const normalized = stripBom(raw);
  const trimmed = normalized.trim();
  if (trimmed === "") return null;
  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) {
    try { return JSON.parse(normalized); } catch { return raw; }
  }
  return raw;
}

function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);
  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

async function parseSuccessBody(response: Response, responseType: "json" | "text" | "blob" | "auto", requestInfo: { method: string; url: string }): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) return null;
  const effectiveType = responseType === "auto" ? inferResponseType(response) : responseType;
  switch (effectiveType) {
    case "json": return parseJsonBody(response, requestInfo);
    case "text": { const text = await response.text(); return text === "" ? null : text; }
    case "blob":
      if (typeof response.blob !== "function") throw new TypeError("Blob responses not supported.");
      return response.blob();
  }
}

export async function customFetch<T = unknown>(input: RequestInfo | URL, options: CustomFetchOptions = {}): Promise<T> {
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;
  const method = resolveMethod(input, init.method);

  if (init.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headers = mergeHeaders(isRequest(input) ? input.headers : undefined, headersInit);

  if (typeof init.body === "string" && !headers.has("content-type") && looksLikeJson(init.body)) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  if (_authTokenGetter && !headers.has("authorization")) {
    const token = await _authTokenGetter();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const sessionData = typeof window !== "undefined" ? localStorage.getItem("shifr_session") : null;
  if (sessionData && !headers.has("x-session-id")) {
    try {
      const parsed = JSON.parse(sessionData);
      if (parsed.sessionId) headers.set("x-session-id", parsed.sessionId);
    } catch (_e) {}
  }

  const requestInfo = { method, url: resolveUrl(input) };
  const response = await fetch(input, { ...init, method, headers });

  if (!response.ok) {
    const errorData = await parseErrorBody(response, method);
    throw new ApiError(response, errorData, requestInfo);
  }

  return (await parseSuccessBody(response, responseType, requestInfo)) as T;
}

type SecondParameter<T extends (...args: never[]) => unknown> = Parameters<T>[1];

import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseQueryResult,
  type UseMutationResult,
  type QueryFunction,
  type MutationFunction,
  type QueryKey,
} from "@tanstack/react-query";


export const useLogin = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, { data: BodyType<LoginInput> }, TContext>;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<Awaited<ReturnType<typeof login>>, TError, { data: BodyType<LoginInput> }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof login>>, { data: BodyType<LoginInput> }> = ({ data }) => login(data, options?.request);
  return useMutation({ mutationKey: ["login"], mutationFn, ...options?.mutation });
};

export const useVerifyCode = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyCode>>, TError, { data: BodyType<VerifyInput> }, TContext>;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<Awaited<ReturnType<typeof verifyCode>>, TError, { data: BodyType<VerifyInput> }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof verifyCode>>, { data: BodyType<VerifyInput> }> = ({ data }) => verifyCode(data, options?.request);
  return useMutation({ mutationKey: ["verifyCode"], mutationFn, ...options?.mutation });
};

export function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<void>>(options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>, "queryKey" | "queryFn">;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = ["/api/users/me"];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getMe>>> = ({ signal }) => getMe({ signal, ...options?.request });
  const query = useQuery({ queryKey, queryFn, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export const useUpdateMe = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMe>>, TError, { data: BodyType<UpdateProfileInput> }, TContext>;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<Awaited<ReturnType<typeof updateMe>>, TError, { data: BodyType<UpdateProfileInput> }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateMe>>, { data: BodyType<UpdateProfileInput> }> = ({ data }) => updateMe(data, options?.request);
  return useMutation({ mutationKey: ["updateMe"], mutationFn, ...options?.mutation });
};

export function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<void>>(options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>, "queryKey" | "queryFn">;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = ["/api/users"];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof listUsers>>> = ({ signal }) => listUsers({ signal, ...options?.request });
  const query = useQuery({ queryKey, queryFn, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export function useGetUserById<TData = Awaited<ReturnType<typeof getUserById>>, TError = ErrorType<void>>(id: number, options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof getUserById>>, TError, TData>, "queryKey" | "queryFn">;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = [`/api/users/${id}`];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getUserById>>> = ({ signal }) => getUserById(id, { signal, ...options?.request });
  const query = useQuery({ queryKey, queryFn, enabled: !!id, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export function useFetchMessages<TData = Awaited<ReturnType<typeof fetchMessages>>, TError = ErrorType<void>>(userId: number, options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof fetchMessages>>, TError, TData>, "queryKey" | "queryFn">;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = [`/api/messages/${userId}`];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof fetchMessages>>> = ({ signal }) => fetchMessages(userId, { signal, ...options?.request });
  const query = useQuery({ queryKey, queryFn, enabled: !!userId, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export const useSendMessage = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, { data: BodyType<MessageInput> }, TContext>;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<Awaited<ReturnType<typeof sendMessage>>, TError, { data: BodyType<MessageInput> }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof sendMessage>>, { data: BodyType<MessageInput> }> = ({ data }) => sendMessage(data, options?.request);
  return useMutation({ mutationKey: ["sendMessage"], mutationFn, ...options?.mutation });
};

export function useGetMessageStats<TData = Awaited<ReturnType<typeof getMessageStats>>, TError = ErrorType<void>>(options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof getMessageStats>>, TError, TData>, "queryKey" | "queryFn">;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = ["/api/messages/stats"];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getMessageStats>>> = ({ signal }) => getMessageStats({ signal, ...options?.request });
  const query = useQuery({ queryKey, queryFn, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export const useDeleteMessage = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMessage>>, TError, { id: number; scope: "self" | "all" }, TContext>;
}): UseMutationResult<Awaited<ReturnType<typeof deleteMessage>>, TError, { id: number; scope: "self" | "all" }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteMessage>>, { id: number; scope: "self" | "all" }> = ({ id, scope }) => deleteMessage(id, scope);
  return useMutation({ mutationKey: ["deleteMessage"], mutationFn, ...options?.mutation });
};

export const useEditMessage = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof editMessage>>, TError, { id: number; text: string }, TContext>;
}): UseMutationResult<Awaited<ReturnType<typeof editMessage>>, TError, { id: number; text: string }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof editMessage>>, { id: number; text: string }> = ({ id, text }) => editMessage(id, text);
  return useMutation({ mutationKey: ["editMessage"], mutationFn, ...options?.mutation });
};

export function useGetUnreadCounts<TData = Awaited<ReturnType<typeof getUnreadCounts>>, TError = ErrorType<void>>(options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof getUnreadCounts>>, TError, TData>, "queryKey" | "queryFn">;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = ["/api/messages/unread"];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getUnreadCounts>>> = ({ signal }) => getUnreadCounts({ signal });
  const query = useQuery({ queryKey, queryFn, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export function useGetVapidPublicKey<TData = Awaited<ReturnType<typeof getVapidPublicKey>>, TError = ErrorType<unknown>>(options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof getVapidPublicKey>>, TError, TData>, "queryKey" | "queryFn">;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = ["/api/push/vapid-public-key"];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getVapidPublicKey>>> = ({ signal }) => getVapidPublicKey({ signal });
  const query = useQuery({ queryKey, queryFn, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export const useSubscribePush = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof subscribePush>>, TError, { data: BodyType<PushSubscriptionInput> }, TContext>;
}): UseMutationResult<Awaited<ReturnType<typeof subscribePush>>, TError, { data: BodyType<PushSubscriptionInput> }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof subscribePush>>, { data: BodyType<PushSubscriptionInput> }> = ({ data }) => subscribePush(data);
  return useMutation({ mutationKey: ["subscribePush"], mutationFn, ...options?.mutation });
};

export function useAdminListUsers<TData = Awaited<ReturnType<typeof adminListUsers>>, TError = ErrorType<unknown>>(options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof adminListUsers>>, TError, TData>, "queryKey" | "queryFn">;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = ["/api/admin/users"];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof adminListUsers>>> = ({ signal }) => adminListUsers({ signal });
  const query = useQuery({ queryKey, queryFn, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

export function useAdminListMessages<TData = Awaited<ReturnType<typeof adminListMessages>>, TError = ErrorType<unknown>>(options?: {
  query?: Omit<UseQueryOptions<Awaited<ReturnType<typeof adminListMessages>>, TError, TData>, "queryKey" | "queryFn">;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey: QueryKey = ["/api/admin/messages"];
  const queryFn: QueryFunction<Awaited<ReturnType<typeof adminListMessages>>> = ({ signal }) => adminListMessages({ signal });
  const query = useQuery({ queryKey, queryFn, ...options?.query }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
}

const login = (data: LoginInput, options?: RequestInit): Promise<AuthCodeResponse> =>
  customFetch<AuthCodeResponse>("/api/auth/login", { ...options, method: "POST", headers: { "Content-Type": "application/json", ...options?.headers }, body: JSON.stringify(data) });

const verifyCode = (data: VerifyInput, options?: RequestInit): Promise<AuthSession> =>
  customFetch<AuthSession>("/api/auth/verify", { ...options, method: "POST", headers: { "Content-Type": "application/json", ...options?.headers }, body: JSON.stringify(data) });

const getMe = (options?: RequestInit): Promise<User> =>
  customFetch<User>("/api/users/me", { ...options, method: "GET" });

const updateMe = (data: UpdateProfileInput, options?: RequestInit): Promise<User> =>
  customFetch<User>("/api/users/me", { ...options, method: "PATCH", headers: { "Content-Type": "application/json", ...options?.headers }, body: JSON.stringify(data) });

const listUsers = (options?: RequestInit): Promise<User[]> =>
  customFetch<User[]>("/api/users", { ...options, method: "GET" });

const getUserById = (id: number, options?: RequestInit): Promise<User> =>
  customFetch<User>(`/api/users/${id}`, { ...options, method: "GET" });

const fetchMessages = (userId: number, options?: RequestInit): Promise<Message[]> =>
  customFetch<Message[]>(`/api/messages/${userId}`, { ...options, method: "GET" });

const sendMessage = (data: MessageInput, options?: RequestInit): Promise<Message> =>
  customFetch<Message>("/api/messages", { ...options, method: "POST", headers: { "Content-Type": "application/json", ...options?.headers }, body: JSON.stringify(data) });

const getMessageStats = (options?: RequestInit): Promise<MessageStats> =>
  customFetch<MessageStats>("/api/messages/stats", { ...options, method: "GET" });

const deleteMessage = (id: number, scope: "self" | "all"): Promise<{ ok: boolean }> =>
  customFetch<{ ok: boolean }>(`/api/messages/${id}?scope=${scope}`, { method: "DELETE" });

const editMessage = (id: number, text: string): Promise<Message> =>
  customFetch<Message>(`/api/messages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });

const getUnreadCounts = (options?: RequestInit): Promise<Record<number, number>> =>
  customFetch<Record<number, number>>("/api/messages/unread", { ...options, method: "GET" });

const getVapidPublicKey = (options?: RequestInit): Promise<GetVapidPublicKey200> =>
  customFetch<GetVapidPublicKey200>("/api/push/vapid-public-key", { ...options, method: "GET" });

const subscribePush = (data: PushSubscriptionInput): Promise<{ ok: boolean }> =>
  customFetch<{ ok: boolean }>("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

const adminListUsers = (options?: RequestInit): Promise<AdminUser[]> =>
  customFetch<AdminUser[]>("/api/admin/users", { ...options, method: "GET" });

const adminListMessages = (options?: RequestInit): Promise<Message[]> =>
  customFetch<Message[]>("/api/admin/messages", { ...options, method: "GET" });
