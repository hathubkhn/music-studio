"use client"

import Link from "next/link"
import { Bell, Music2, Search, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Header({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:px-6">
      {/* Mobile logo */}
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500">
          <Music2 className="h-3.5 w-3.5 text-background" />
        </div>
        <span className="font-semibold text-sm">MusicStudio</span>
      </Link>

      {title && (
        <h1 className="hidden md:block text-sm font-semibold text-foreground/80">{title}</h1>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        {/* Mobile create button */}
        <Link href="/create" className="md:hidden">
          <Button
            size="sm"
            className="bg-teal-500 hover:bg-teal-400 text-background font-semibold gap-1.5 h-8 px-3 text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
        </Button>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] bg-teal-500 text-background font-bold">
            U
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
