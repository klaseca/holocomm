export interface MessageAuthor {
  readonly id: string
  readonly displayName: string
}

export interface Message {
  readonly id: string
  readonly roomId: string
  readonly author: MessageAuthor
  readonly content: string
  readonly createdAt: number
}
