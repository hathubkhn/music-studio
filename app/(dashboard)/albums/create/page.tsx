import { AlbumCreateFlow } from "@/components/album/album-create-flow"
import Link from "next/link"
import { ChevronLeft, Disc3 } from "lucide-react"

export default function CreateAlbumPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/albums"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />Albums
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Disc3 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create Album</h1>
            <p className="text-sm text-muted-foreground">
              AI generates multiple songs on the same theme — perfect for long-form video
            </p>
          </div>
        </div>
      </div>

      <AlbumCreateFlow />
    </div>
  )
}
