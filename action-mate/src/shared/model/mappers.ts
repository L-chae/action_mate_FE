// src/shared/model/mappers.ts
import type { ErrorResponse } from "@/shared/api/schemas";
import type {
  Capacity,
  CapacityRaw,
  Gender,
  Id,
  Location,
  LocationRaw,
  NormalizedId,
  UserSummary,
  UserSummaryRaw,
} from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";

/**
 * 서버가 불안정/느릴 때 "화면이 깨지지 않게" 하기 위한 최소 mapper 세트.
 * - 화면(UI)은 반드시 UI Model만 쓰도록 유도하고
 * - 서버 응답의 흔들림은 여기서 한 번만 흡수합니다.
 */

export const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const toNumberOrNull = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toIntOrZero = (v: unknown): number => {
  const n = toNumberOrNull(v);
  if (n == null) return 0;
  // 인원/카운트는 정수로 쓰는 게 일반적이라 정수화
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

export const mapServerGenderToGender = (
  g: "남" | "여" | undefined,
  fallback: Gender = "male",
): Gender => {
  if (g === "남") return "male";
  if (g === "여") return "female";
  return fallback;
};

export const mapGenderToServerGender = (g: Gender): "남" | "여" =>
  g === "male" ? "남" : "여";

export const mapUserSummaryRawToUserSummary = (
  raw: UserSummaryRaw | null | undefined,
  opts?: { fallbackId?: Id; fallbackNickname?: string },
): UserSummary => {
  const fallbackId = opts?.fallbackId ?? "unknown";
  const fallbackNickname = opts?.fallbackNickname ?? "알 수 없음";

  if (!raw || !isRecord(raw)) {
    return { id: normalizeId(fallbackId), nickname: fallbackNickname, avatarUrl: null };
  }

  const id = "id" in raw ? (raw["id"] as Id) : fallbackId;
  const nickname =
    typeof raw["nickname"] === "string" && raw["nickname"].trim() !== ""
      ? (raw["nickname"] as string)
      : fallbackNickname;

  const avatarUrl =
    raw["avatarUrl"] === null
      ? null
      : typeof raw["avatarUrl"] === "string"
        ? (raw["avatarUrl"] as string)
        : null;

  return { id: normalizeId(id), nickname, avatarUrl };
};

export const mapLocationRawToLocation = (
  raw: LocationRaw | null | undefined,
  fallbackName = "장소 미정",
): Location => {
  if (!raw || !isRecord(raw)) {
    return { name: fallbackName, latitude: null, longitude: null, address: null };
  }

  const name =
    typeof raw["name"] === "string" && raw["name"].trim() !== ""
      ? (raw["name"] as string)
      : fallbackName;

  // 서버가 latitude/longitude 또는 lat/lng를 섞어 줄 수 있어 둘 다 수용
  const latitude = toNumberOrNull(raw["latitude"] ?? raw["lat"]);
  const longitude = toNumberOrNull(raw["longitude"] ?? raw["lng"]);

  const address =
    raw["address"] === null
      ? null
      : typeof raw["address"] === "string"
        ? (raw["address"] as string)
        : null;

  return { name, latitude, longitude, address };
};

export const mapCapacityRawToCapacity = (raw: CapacityRaw | null | undefined): Capacity => {
  if (!raw || !isRecord(raw)) return { current: 0, max: 0 };

  const current = toIntOrZero(raw["current"]);
  const max = toIntOrZero(raw["max"] ?? raw["total"]);

  return { current, max };
};

export const mapErrorResponse = (err: ErrorResponse | unknown): { code: string; message: string } => {
  if (!err || !isRecord(err)) return { code: "UNKNOWN_ERROR", message: "알 수 없는 오류" };

  const code =
    typeof err["code"] === "string" && err["code"].trim() !== ""
      ? (err["code"] as string)
      : "UNKNOWN_ERROR";

  const message =
    typeof err["message"] === "string" && err["message"].trim() !== ""
      ? (err["message"] as string)
      : "알 수 없는 오류";

  return { code, message };
};

/**
 * 편의: 문자열 id를 안전하게 만드는 헬퍼
 * - 서버가 id를 비워서 주는 경우(매우 불안정)에도 최소한 key 충돌을 줄입니다.
 */
export const normalizeIdSafe = (id: Id | null | undefined, fallback: Id = "unknown"): NormalizedId =>
  normalizeId(id ?? fallback);