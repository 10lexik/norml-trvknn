export interface Question {
  _id: string
  category: string
  question: string
  options: string[]
  correct?: number
  explanation?: string
}

export interface UnifiedNetworkConfig {
  id: string
  label: string
  icon: string
  url: string
  color: string
  baseUrl: string
}

export interface LeaderboardEntry {
  name: string
  score: number
  time?: number
  memberId?: string
  isUser?: boolean
  socials?: Record<string, string>
}
