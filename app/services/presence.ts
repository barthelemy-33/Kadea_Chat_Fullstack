// Dernière activité de chaque utilisateur (en mémoire du serveur)
const lastSeen = new Map<number, number>()
const ONLINE_WINDOW = 60_000

export function touch(userId: number) {
  lastSeen.set(userId, Date.now())
}

export function isOnline(userId: number) {
  const time = lastSeen.get(userId)
  return time !== undefined && Date.now() - time < ONLINE_WINDOW
}
