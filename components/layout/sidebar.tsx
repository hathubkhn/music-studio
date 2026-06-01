"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, FolderOpen, PlusCircle,
  Settings, Music2, Sparkles, BarChart3, Zap, Disc3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects",  label: "Projects",  icon: FolderOpen },
  { href: "/albums",    label: "Albums",    icon: Disc3 },
  { href: "/dashboard?tab=analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings",  label: "Settings",  icon: Settings },
]

/* Animated waveform for sidebar logo */
function MiniWave() {
  return (
    <div className="flex items-end gap-px h-3">
      {[2, 3, 4, 3, 4, 2, 3].map((h, i) => (
        <div
          key={i}
          className="w-0.5 rounded-full bg-teal-400 wave-bar"
          style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border/50 bg-background h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/50">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500 shadow-lg shadow-teal-500/30">
          <Music2 className="h-3.5 w-3.5 text-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight">MusicStudio</span>
          </div>
          <MiniWave />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {/* Create CTAs */}
          <Link href="/create" className="block mb-1">
            <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-background font-semibold text-sm transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-400/30">
              <PlusCircle className="h-4 w-4 shrink-0" />
              New Project
              <Sparkles className="h-3 w-3 ml-auto opacity-70" />
            </button>
          </Link>
          <Link href="/albums/create" className="block mb-3">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 font-medium text-sm transition-all border border-violet-500/20">
              <Disc3 className="h-4 w-4 shrink-0" />
              New Album
            </button>
          </Link>

          {navItems.map((item) => {
            const Icon = item.icon
            const href = item.href.split("?")[0]
            const isActive = pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href))

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                    isActive
                      ? "bg-teal-500/12 text-teal-400 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-teal-400")} />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-1 h-1 rounded-full bg-teal-400" />
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </ScrollArea>

      {/* Mock mode pill */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-amber-300">Mock Mode</p>
            <p className="text-[10px] text-amber-400/60 truncate">Add keys to go live</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
