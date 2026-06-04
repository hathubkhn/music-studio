import type { AlbumData } from "@/components/album/album-create-flow"

export type SavedAlbum = {
  id: string
  tracks: { id: string; order: number }[]
}

/** Create or update album + tracks in the database. */
export async function persistAlbum(data: AlbumData): Promise<SavedAlbum> {
  const payload = {
    title:       data.title,
    theme:       data.theme,
    genre:       data.genre,
    mood:        data.mood,
    language:    data.language,
    stylePrompt: data.stylePrompt,
    tracks:      data.tracks.map((t) => ({
      order:       t.order,
      title:       t.title,
      description: t.description,
      lyrics:      t.lyrics,
      stylePrompt: t.stylePrompt,
    })),
  }

  if (data.id) {
    // Album already saved — update metadata only (never replace tracks;
    // that would wipe generated audio URLs and DB track IDs).
    const hasDbTracks = data.tracks.some((t) => t.id)
    const res = await fetch(`/api/albums/${data.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(
        hasDbTracks
          ? {
              title:       payload.title,
              theme:       payload.theme,
              genre:       payload.genre,
              mood:        payload.mood,
              language:    payload.language,
              stylePrompt: payload.stylePrompt,
            }
          : payload
      ),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? "Failed to update album")
    }
    const album = await res.json()
    return {
      id:     album.id as string,
      tracks: (album.tracks as { id: string; order: number }[]).map((t) => ({
        id:    t.id,
        order: t.order,
      })),
    }
  }

  const res = await fetch("/api/albums", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? "Failed to save album")
  }
  const album = await res.json()
  return {
    id:     album.id as string,
    tracks: (album.tracks as { id: string; order: number }[]).map((t) => ({
      id:    t.id,
      order: t.order,
    })),
  }
}
