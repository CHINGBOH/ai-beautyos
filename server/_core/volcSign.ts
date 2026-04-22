/**
 * 火山引擎 OpenAPI 签名（用于 GetApiKey 等管控面 API）
 * 参考：https://www.volcengine.com/docs/6369/67269
 */

import crypto from "crypto";

function hmac(secret: string | Buffer, s: string): Buffer {
  return crypto.createHmac("sha256", secret).update(s, "utf8").digest();
}

function hash(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function uriEscape(str: string): string {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, c => encodeURIComponent(c))
      .replace(/[*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch {
    return "";
  }
}

function queryParamsToString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(key => {
      const val = params[key];
      if (val === undefined || val === null) return undefined;
      const escapedKey = uriEscape(key);
      if (!escapedKey) return undefined;
      return `${escapedKey}=${uriEscape(String(val))}`;
    })
    .filter((v): v is string => !!v)
    .join("&");
}

function getDateTimeNow(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
}

/**
 * 生成火山 OpenAPI Authorization header
 */
export function signVolcRequest(params: {
  method: string;
  pathName?: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  bodySha?: string;
  region?: string;
  serviceName?: string;
  accessKeyId: string;
  secretAccessKey: string;
}): string {
  const {
    method = "GET",
    pathName = "/",
    query = {},
    headers = {},
    bodySha,
    region = "cn-beijing",
    serviceName = "ark",
    accessKeyId,
    secretAccessKey,
  } = params;

  const datetime = headers["X-Date"] || getDateTimeNow();
  const date = datetime.substring(0, 8);

  const needSignKeys = ["content-type", "host", "x-content-sha256", "x-date"];
  const present = Object.entries(headers)
    .filter(([k]) => needSignKeys.includes(k.toLowerCase()))
    .map(([k]) => k.toLowerCase());
  const signHeaderKeys = Array.from(
    new Set([...present, "host", "x-date"])
  ).sort();
  const canonicalHeaders = signHeaderKeys
    .map(k => {
      const key = Object.keys(headers).find(h => h.toLowerCase() === k) || k;
      const v = (headers[key] ?? "").trim().replace(/\s+/g, " ");
      return `${k}:${v}`;
    })
    .join("\n");
  const signHeaders = signHeaderKeys.join(";");

  const canonicalRequest = [
    method.toUpperCase(),
    pathName,
    queryParamsToString(query) || "",
    canonicalHeaders + "\n",
    signHeaders,
    bodySha || hash(""),
  ].join("\n");

  const credentialScope = [date, region, serviceName, "request"].join("/");
  const stringToSign = [
    "HMAC-SHA256",
    datetime,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");

  const kDate = hmac(secretAccessKey, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signHeaders},`,
    `Signature=${signature}`,
  ].join(" ");
}

const ARK_OPENAPI_HOST = "ark.cn-beijing.volcengineapi.com";

/**
 * 使用 AK/SK 调用 GetApiKey 获取指定推理接入点的临时 API Key
 */
export async function getVolcArkApiKeyWithAKSK(
  accessKeyId: string,
  secretAccessKey: string,
  endpointId: string,
  durationSeconds = 86400
): Promise<string> {
  const body = {
    DurationSeconds: durationSeconds,
    ResourceType: "endpoint",
    ResourceIds: [endpointId],
  };
  const bodyStr = JSON.stringify(body);
  const bodySha = crypto
    .createHash("sha256")
    .update(bodyStr, "utf8")
    .digest("hex");

  const query: Record<string, string> = {
    Action: "GetApiKey",
    Version: "2024-01-01",
  };
  const xDate = getDateTimeNow();
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=UTF-8",
    Host: ARK_OPENAPI_HOST,
    "X-Date": xDate,
    "X-Content-Sha256": bodySha,
  };

  const authorization = signVolcRequest({
    method: "POST",
    pathName: "/",
    query,
    headers,
    bodySha,
    region: "cn-beijing",
    serviceName: "ark",
    accessKeyId,
    secretAccessKey,
  });

  const url = `https://${ARK_OPENAPI_HOST}/?Action=${encodeURIComponent(query.Action)}&Version=${encodeURIComponent(query.Version)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      Authorization: authorization,
    },
    body: bodyStr,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GetApiKey 失败: ${res.status} – ${text}`);
  }

  const data = JSON.parse(text) as { Result?: { ApiKey?: string } };
  const apiKey = data?.Result?.ApiKey;
  if (!apiKey) {
    throw new Error(`GetApiKey 返回无 ApiKey: ${text.slice(0, 300)}`);
  }
  return apiKey;
}

/** 智能绘图服务（方式一）CVProcess 文生图，返回 base64 图片 */
const VISUAL_OPENAPI_HOST = "visual.volcengineapi.com";

export async function visualCVProcessT2I(
  accessKeyId: string,
  secretAccessKey: string,
  prompt: string,
  options?: {
    width?: number;
    height?: number;
    seed?: number;
    scale?: number;
    ddim_steps?: number;
  }
): Promise<string> {
  const body = {
    req_key: "high_aes_t2i",
    prompt,
    seed: options?.seed ?? -1,
    scale: options?.scale ?? 5.5,
    ddim_steps: options?.ddim_steps ?? 25,
    width: options?.width ?? 512,
    height: options?.height ?? 512,
    logo_info: { add_logo: false, position: 0, language: 0, opacity: 1 },
  };
  const bodyStr = JSON.stringify(body);
  const bodySha = crypto
    .createHash("sha256")
    .update(bodyStr, "utf8")
    .digest("hex");

  const query: Record<string, string> = {
    Action: "CVProcess",
    Version: "2022-08-31",
  };
  const xDate = getDateTimeNow();
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=UTF-8",
    Host: VISUAL_OPENAPI_HOST,
    "X-Date": xDate,
    "X-Content-Sha256": bodySha,
  };

  const authorization = signVolcRequest({
    method: "POST",
    pathName: "/",
    query,
    headers,
    bodySha,
    region: "cn-beijing",
    serviceName: "visual",
    accessKeyId,
    secretAccessKey,
  });

  const url = `https://${VISUAL_OPENAPI_HOST}/?Action=${encodeURIComponent(query.Action)}&Version=${encodeURIComponent(query.Version)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, Authorization: authorization },
    body: bodyStr,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`智能绘图 CVProcess 失败: ${res.status} – ${text}`);
  }

  const data = JSON.parse(text) as {
    code?: number;
    data?: { binary_data_base64?: string[] };
  };
  if (data?.code !== 10000) {
    throw new Error(
      `智能绘图返回异常: code=${data?.code} – ${text.slice(0, 300)}`
    );
  }
  const b64 = data?.data?.binary_data_base64?.[0];
  if (!b64) {
    throw new Error("智能绘图返回无 binary_data_base64");
  }
  return b64;
}
