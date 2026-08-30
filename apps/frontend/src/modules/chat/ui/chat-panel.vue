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
    <div class="chat__messages" tabindex="0">
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
  border-top: var(--stroke-default) solid var(--color-border-default);
  background: var(--color-surface-canvas);
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
  color: var(--color-content-secondary);
  font-size: var(--font-size-sm);
}

.chat__messages {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.chat__empty {
  padding: var(--space-5);
  color: var(--color-content-secondary);
  text-align: center;
}

.message-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: var(--space-3) var(--space-4);
  list-style: none;
}

.message {
  display: grid;
  gap: var(--space-1);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  transition: background-color var(--duration-fast) var(--ease-out);
}

.message:hover {
  background: var(--color-surface-panel);
}

.message__meta {
  gap: var(--space-2);
}

.message--self strong {
  color: var(--color-content-accent);
}

.message p {
  overflow-wrap: anywhere;
  line-height: var(--line-height-body);
}

.chat__composer {
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.chat__composer > :first-child {
  flex: 1;
}
</style>
