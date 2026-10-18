import { fail } from "@agent-native/core/action";
import { ssrfSafeFetch } from "@agent-native/core/extensions/url-safety";
import { readAppSecret } from "@agent-native/core/secrets";
import { getRequestOrgId, getRequestUserEmail } from "@agent-native/core/server/request-context";
import { AwsClient } from "aws4fetch";

export const PRIVATE_COURSE_FILE_URL = /^\/api\/course-files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
export const MAX_COURSE_FILE_BYTES = 25 * 1024 * 1024;

export function courseStorageScope() {
  const email = getRequestUserEmail()?.trim();
  if (!email) fail("Sign in to access course storage.", { statusCode: 401 });
  const orgId = getRequestOrgId() ?? null;
  return { email, orgId, scopeId: orgId || `solo:${email}` };
}

export async function readCourseStorage(scopeId: string) {
  const keys = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const values = await Promise.all(keys.map((key) => readAppSecret({ key, scope: "workspace", scopeId })));
  const [endpointValue, bucket, accessKeyId, secretAccessKey] = values.map((entry) => entry?.value.trim());
  if (!endpointValue || !bucket || !accessKeyId || !secretAccessKey) return null;
  if (!URL.canParse(endpointValue)) return null;
  const endpoint = new URL(endpointValue);
  if (
    endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.port ||
    endpoint.search || endpoint.hash || !["", "/"].includes(endpoint.pathname) ||
    !/^[a-f0-9]{32}(?:\.eu|\.fedramp)?\.r2\.cloudflarestorage\.com$/i.test(endpoint.hostname) ||
    !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)
  ) return null;
  return { endpoint: endpoint.origin, bucket, accessKeyId, secretAccessKey };
}

export type CourseStorage = NonNullable<Awaited<ReturnType<typeof readCourseStorage>>>;

export async function courseStorageRequest(
  config: CourseStorage,
  key: string,
  method: "PUT" | "GET" | "DELETE",
  options: { data?: Uint8Array; mimeType?: string; range?: string } = {},
) {
  const url = `${config.endpoint}/${encodeURIComponent(config.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const headers = new Headers();
  if (options.mimeType) headers.set("Content-Type", options.mimeType);
  if (options.range) headers.set("Range", options.range);
  const body = options.data ? new Uint8Array(options.data).buffer : undefined;
  const client = new AwsClient({ ...config, region: "auto", service: "s3" });
  const request = await client.sign(url, { method, headers, body });
  try {
    return await ssrfSafeFetch(request.url, {
      method,
      headers: request.headers,
      body,
      signal: AbortSignal.timeout(60_000),
    }, { httpsOnly: true, followRedirects: false });
  } catch {
    fail("Couldn't reach R2. Check the S3 API endpoint and try again.", { statusCode: 502 });
  }
}

export function requireStorageResponse(response: Response) {
  if (response.ok) return;
  if (response.status === 401 || response.status === 403) {
    fail("R2 denied access. Check that the keys have Object Read & Write permission for this bucket.", { statusCode: 502 });
  }
  if (response.status === 404) fail("R2 couldn't find the bucket or file. Check the bucket name.", { statusCode: 502 });
  fail("R2 couldn't complete the request. Check the connection and try again.", { statusCode: 502 });
}
