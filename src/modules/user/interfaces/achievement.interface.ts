export interface AchievementItem {
    _id: string
    name: string
    achievementImage: string
    achievementDescription: string
    count: number
}

export interface UserAchievementData {
    _id: string
    userId: string
    name: string
    country: string
    countryCode: string
    countryFlag: string
    email: string
    image: string
    coverImage: string
    level: number
    binsBalance: number
    diamondBalance: number
    frameId: string | null
    frameImage: string | null
    badge: string[]
    gift: AchievementItem[]
    entryEffect: AchievementItem[]
    frame: AchievementItem[]
    friend: number
    follower: number
    following: number
    visitorCount: number
}
