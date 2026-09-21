<script setup lang="ts">
import type { ChatMessageDto } from '@holocomm/protocol'
import { ref } from 'vue'

import { Button, Input } from '#/ui/primitives'

const props = defineProps<{
  canSend: boolean
  messages: readonly ChatMessageDto[]
  selfId?: string
}>()

const emit = defineEmits<{
  send: [content: string, acknowledge: (sent: boolean) => void]
}>()

const draft = ref('')

function send(): void {
  const content = draft.value.trim()

  if (!props.canSend || content.length === 0) {
    return
  }

  emit('send', content, (sent) => {
    if (sent) {
      draft.value = ''
    }
  })
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}
</script>

<template>
  <section class="chat" aria-label="Live chat">
    <div
      class="chat__messages"
      role="region"
      aria-label="Chat messages"
      tabindex="0"
    >
      <p v-if="messages.length === 0" class="chat__empty">
        Nothing here yet. Messages appear only while you are in the room.
      </p>
      <ol v-else class="message-list" aria-live="polite">
        <li
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="{ 'message--self': message.author.id === selfId }"
        >
          <div class="message__meta">
            <strong>{{ message.author.displayName }}</strong>
            <time :datetime="new Date(message.createdAt).toISOString()">
              {{ formatTime(message.createdAt) }}
            </time>
          </div>
          <p>{{ message.content }}</p>
        </li>
      </ol>
    </div>

    <form class="chat__composer" @submit.prevent="send">
      <Input
        v-model="draft"
        aria-label="Message"
        autocomplete="off"
        :disabled="!canSend"
        maxlength="2000"
        placeholder="Message this room"
      />
      <Button :disabled="!canSend || draft.trim().length === 0" native-type="submit">Send</Button>
    </form>
  </section>
</template>

<style scoped>
.chat {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
  border-top: var(--border-width-thin) solid var(--border-color-default);
  background: var(--bg-color-default);
}

.chat__composer,
.message__meta {
  display: flex;
  align-items: center;
}

.message p,
.chat__empty {
  margin: 0;
}

time {
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-medium);
}

.chat__messages {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.chat__empty {
  padding: var(--base-size-20);
  color: var(--fg-color-muted);
  text-align: center;
}

.message-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: var(--base-size-12) var(--base-size-16);
  list-style: none;
}

.message {
  display: grid;
  gap: var(--base-size-4);
  border-radius: var(--border-radius-medium);
  padding: var(--base-size-4) var(--base-size-12);
  transition: background-color var(--motion-duration-micro) var(--motion-easing-hover);
}

.message:hover {
  background: var(--bg-color-muted);
}

.message__meta {
  gap: var(--base-size-8);
}

.message--self strong {
  color: var(--fg-color-accent);
}

.message p {
  overflow-wrap: anywhere;
  line-height: var(--text-body-line-height-medium);
}

.chat__composer {
  gap: var(--base-size-8);
  padding: var(--base-size-12) var(--base-size-16) var(--base-size-16);
}

.chat__composer > :first-child {
  flex: 1;
}
</style>
