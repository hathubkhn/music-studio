import {
  Settings, Key, Database, Server, DollarSign,
  CheckCircle2, XCircle, Info, Code
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

const MOCK_MODE = process.env.MOCK_MODE !== "false"
const HAS_OPENAI = Boolean(
  process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_openai_api_key_here"
)
const HAS_KIE = Boolean(
  process.env.KIE_API_KEY && process.env.KIE_API_KEY !== "your_kie_api_key_here"
)

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your API integrations and preferences</p>
      </div>

      {/* Status overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-primary" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Mock Mode", active: MOCK_MODE, description: "Using mock responses for testing" },
            { label: "OpenAI (Lyrics/Scenes)", active: HAS_OPENAI, description: "GPT for lyrics and scene generation" },
            { label: "Kie.ai (Music/Images)", active: HAS_KIE, description: "Music and image generation via Kie.ai" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {item.active ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Badge variant={item.active ? "success" : "secondary"}>
                {item.active ? "Active" : "Not Set"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* How to configure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-primary" />
            Configuration Guide
          </CardTitle>
          <CardDescription>
            Edit your <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file to configure API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              API keys are configured via environment variables and never exposed to the client.
              Edit your <code>.env</code> file and restart the dev server.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-purple-500">1.</span>
                Enable Real Mode
              </p>
              <code className="text-xs block bg-background p-2 rounded border font-mono">
                MOCK_MODE=false
              </code>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-purple-500">2.</span>
                Add OpenAI Key (for lyrics generation)
              </p>
              <code className="text-xs block bg-background p-2 rounded border font-mono">
                OPENAI_API_KEY=sk-...your-key...<br/>
                OPENAI_MODEL=gpt-4o-mini
              </code>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-purple-500">3.</span>
                Add Kie.ai Key (for music & images)
              </p>
              <code className="text-xs block bg-background p-2 rounded border font-mono">
                KIE_API_KEY=your-kie-api-key<br/>
                KIE_BASE_URL=https://api.kie.ai<br/>
                KIE_SUNO_MODEL=suno-v4<br/>
                KIE_IMAGE_MODEL=flux-1.1-pro
              </code>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-purple-500">4.</span>
                Database (PostgreSQL)
              </p>
              <code className="text-xs block bg-background p-2 rounded border font-mono">
                DATABASE_URL=postgresql://user:pass@localhost:5432/music_studio
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Pricing Assumptions
          </CardTitle>
          <CardDescription>
            Estimated costs per generation (for dashboard display)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { op: "Music (Suno v4)", unit: "per track", cost: "$0.05" },
              { op: "Image (Flux 1.1 Pro)", unit: "per image", cost: "$0.04" },
              { op: "Video (Kling v1.5)", unit: "per 5 seconds", cost: "$0.14" },
              { op: "Lyrics (GPT-4o-mini)", unit: "per 1k tokens", cost: "$0.00015" },
            ].map((item) => (
              <div key={item.op} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{item.op}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </div>
                <Badge variant="outline">{item.cost}</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Update pricing in <code className="bg-muted px-1 py-0.5 rounded">lib/cost/pricing.ts</code>
          </p>
        </CardContent>
      </Card>

      {/* Version info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Code className="h-4 w-4" />
              MusicStudio AI v1.0.0
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">Phase 1 & 2</Badge>
              <Badge variant="secondary">Open Source</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
