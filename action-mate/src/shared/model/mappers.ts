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

export const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

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
  return Math.max(0, Math.trunc(n));
};

export const mapServerGenderToGender = (g: "M" | "F" | undefined, fallback: Gender = "male"): Gender => {
  if (g === "M") return "male";
  if (g === "F") return "female";
  return fallback;
};

export const mapGenderToServerGender = (g: Gender): "M" | "F" => (g === "male" ? "M" : "F");

export const mapUserSummaryRawToUserSummary = (
  raw: UserSummaryRaw | null | undefined,
  opts?: { fallbackId?: Id; fallbackNickname?: string },
): UserSummary => {
  const fallbackId = opts?.fallbackId ?? "unknown";
  const fallbackNickname = opts?.fallbackNickname ?? "알 수 없음";

  if (!raw || !isRecord(raw)) {
    return { id: normalizeId(fallbackId), nickname: fallbackNickname, avatarUrl: null };
  }

  const id = ((raw["id"] as Id | undefined) ?? fallbackId) as Id;

  const nickname =
    typeof raw["nickname"] === "string" && raw["nickname"].trim() !== ""
      ? (raw["nickname"] as string)
      : fallbackNickname;

  const avatarUrl =
    raw["avatarUrl"] === null ? null : typeof raw["avatarUrl"] === "string" ? (raw["avatarUrl"] as string) : null;

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
    typeof raw["name"] === "string" && raw["name"].trim() !== "" ? (raw["name"] as string) : fallbackName;

  const latitude = toNumberOrNull(raw["latitude"]);
  const longitude = toNumberOrNull(raw["longitude"]);

  const address =
    raw["address"] === null ? null : typeof raw["address"] === "string" ? (raw["address"] as string) : null;

  return { name, latitude, longitude, address };
};

export const mapCapacityRawToCapacity = (raw: CapacityRaw | null | undefined): Capacity => {
  if (!raw || !isRecord(raw)) return { current: 0, max: 0 };

  const current = toIntOrZero(raw["current"]);
  const max = toIntOrZero(raw["max"]);

  return { current, max };
};

export const mapErrorResponse = (err: ErrorResponse | unknown): { code: string; message: string } => {
  if (!err || !isRecord(err)) return { code: "UNKNOWN_ERROR", message: "알 수 없는 오류" };

  const code =
    typeof err["code"] === "string" && err["code"].trim() !== "" ? (err["code"] as string) : "UNKNOWN_ERROR";

  const message =
    typeof err["message"] === "string" && err["message"].trim() !== "" ? (err["message"] as string) : "알 수 없는 오류";

  return { code, message };
};

export const normalizeIdSafe = (id: Id | null | undefined, fallback: Id = "unknown"): NormalizedId =>
  normalizeId(id ?? fallback);

/*
요약:
1) v1.2.4 기준으로 서버 성별을 "M/F"로 확정 매핑.
2) Location/Capacity는 명세 필드명(latitude/longitude, current/max) 기준으로 정리.
3) 나머지 변환은 UI 모델만 깨지지 않게 최소 안전 처리만 유지.
*/