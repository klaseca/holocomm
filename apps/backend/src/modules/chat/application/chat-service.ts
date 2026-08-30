import { ApplicationError } from '#/shared/errors/application-error.ts'

import type { Message, MessageAuthor } from '../domain/message.ts'

export interface ChatServiceOptions {
  readonly maxMessageLength: number
}

export interface SendMessageCommand {
  readonly roomId: string
  readonly author: MessageAuthor
  readonly content: string
}

const DEFAULT_OPTIONS: ChatServiceOptions = {
  maxMessageLength: 2_000,
}

export class ChatService {
  private readonly options: ChatServiceOptions

  constructor(options: Partial<ChatServiceOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    if (!Number.isInteger(this.options.maxMessageLength) || this.options.maxMessageLength < 1) {
      throw new RangeError('maxMessageLength must be a positive integer')
    }
  }

  createMessage(command: SendMessageCommand): Message {
    const content = normalizeMessageContent(command.content)

    if (content.length > this.options.maxMessageLength) {
      throw new ApplicationError(
        'MESSAGE_TOO_LONG',
        `Message cannot exceed ${this.options.maxMessageLength} characters`,
      )
    }

    return {
      id: crypto.randomUUID(),
      roomId: command.roomId,
      author: { ...command.author },
      content,
      createdAt: Date.now(),
    }
  }
}

function normalizeMessageContent(value: string): string {
  const content = value.trim().replace(/\r\n?/g, '\n')

  if (content.length === 0 || containsUnsupportedControlCharacter(content)) {
    throw new ApplicationError('INVALID_MESSAGE', 'Message content is empty or invalid')
  }

  return content
}

function containsUnsupportedControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0)

    return codePoint != null && codePoint < 32 && codePoint !== 9 && codePoint !== 10
  })
}
