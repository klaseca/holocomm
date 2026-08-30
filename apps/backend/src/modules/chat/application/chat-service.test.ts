import { describe, expect, test } from 'vitest'

import { ChatService } from './chat-service.ts'

const alice = { id: 'alice', displayName: 'Alice' }

describe('chatService', () => {
  test('normalizes and creates a transient message', () => {
    const chat = new ChatService()

    const message = chat.createMessage({
      roomId: 'room-1',
      author: alice,
      content: '  Hello!  ',
    })

    expect(message).toMatchObject({
      roomId: 'room-1',
      author: alice,
      content: 'Hello!',
    })
  })

  test('rejects empty, invalid and oversized content', () => {
    const chat = new ChatService({ maxMessageLength: 5 })

    expect(() => chat.createMessage({ roomId: 'room-1', author: alice, content: '   ' })).toThrow(
      'Message content is empty or invalid',
    )

    expect(() =>
      chat.createMessage({ roomId: 'room-1', author: alice, content: 'bad\u0000' }),
    ).toThrow('Message content is empty or invalid')

    expect(() =>
      chat.createMessage({ roomId: 'room-1', author: alice, content: '123456' }),
    ).toThrow('Message cannot exceed 5 characters')
  })
})
