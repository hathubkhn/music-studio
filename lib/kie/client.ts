import { KieApiError } from "./types"

const KIE_BASE_URL = process.env.KIE_BASE_URL || "https://api.kie.ai"
const KIE_API_KEY = process.env.KIE_API_KEY || ""

export class KieClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl = KIE_BASE_URL, apiKey = KIE_API_KEY) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    })

    // Try to parse body regardless of HTTP status
    let json: Record<string, unknown>
    try {
      json = await response.json()
    } catch {
      throw new Error(
        `Kie API Error: ${response.statusText || "Unknown error"} (HTTP ${response.status})`
      )
    }

    // HTTP-level failure
    if (!response.ok) {
      throw new Error(
        `Kie API Error: ${(json?.msg as string) || response.statusText} (HTTP ${response.status})`
      )
    }

    // Kie wraps responses in { code, msg, data } — check the logical code
    if (json?.code !== undefined && json.code !== 200) {
      throw new Error(
        `Kie API Error: ${(json.msg as string) || "Unknown error"} (code: ${json.code})`
      )
    }

    return json as T
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" })
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey !== "your_kie_api_key_here")
  }
}

export const kieClient = new KieClient()
