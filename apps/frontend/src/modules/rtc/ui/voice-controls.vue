<script setup lang="ts">
import { Avatar, Tooltip } from '#/ui/primitives'

import type { ScreenShareState } from '../domain/screen-share.ts'
import type { MicrophoneState } from '../domain/voice.ts'

const props = defineProps<{
  displayName: string
  microphoneState: MicrophoneState
  screenShareState: ScreenShareState
}>()

const emit = defineEmits<{
  leave: []
  openMediaSettings: []
  toggleMicrophone: []
  toggleScreenShare: []
}>()

function microphoneTooltip(): string {
  switch (props.microphoneState) {
    case 'off': return 'Enable microphone'
    case 'requesting': return 'Waiting for microphone permission'
    case 'enabled': return 'Mute microphone'
    case 'muted': return 'Unmute microphone'
    case 'denied': return 'Microphone permission was denied; click to try again'
    case 'error': return 'Microphone is unavailable; click to try again'
  }
}

function screenShareTooltip(): string {
  switch (props.screenShareState) {
    case 'off': return 'Share your screen and available system audio'
    case 'requesting': return 'Choose a screen or window'
    case 'sharing': return 'Stop sharing your screen'
    case 'denied': return 'Screen sharing was cancelled; click to try again'
    case 'error': return 'Screen sharing is unavailable; click to try again'
  }
}
</script>

<template>
  <footer class="voice-controls" aria-label="Room controls">
    <div class="voice-controls__identity">
      <Avatar :name="displayName" size="sm" />
      <div class="voice-controls__user">
        <strong>{{ displayName }}</strong>
        <span :class="{ 'voice-controls__status--muted': microphoneState !== 'enabled' }">
          {{ microphoneState === 'enabled' ? 'Voice connected' : 'Microphone off' }}
        </span>
      </div>
    </div>

    <div class="voice-controls__actions">
      <Tooltip text="Media quality settings">
        <button
          type="button"
          class="control-button"
          aria-label="Media quality settings"
          @click="emit('openMediaSettings')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip :text="microphoneTooltip()">
        <button
          type="button"
          class="control-button"
          :class="{
            'control-button--muted': microphoneState !== 'enabled'
              && microphoneState !== 'requesting',
            'control-button--loading': microphoneState === 'requesting',
          }"
          :aria-label="microphoneState === 'enabled' ? 'Mute microphone' : 'Enable microphone'"
          :aria-pressed="microphoneState !== 'enabled'"
          :aria-busy="microphoneState === 'requesting'"
          :disabled="microphoneState === 'requesting'"
          @click="emit('toggleMicrophone')"
        >
          <svg
            v-if="microphoneState === 'requesting'"
            class="control-button__spinner"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
          <svg
            v-else-if="microphoneState === 'enabled'"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 9v1a3 3 0 0 0 5.1 2.1M15 8V5a3 3 0 0 0-5.6-1.5M17.7 14.7A7 7 0 0 0 19 10M5 10a7 7 0 0 0 11.7 5.2M12 17v5M8 22h8M3 3l18 18" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip :text="screenShareTooltip()">
        <button
          type="button"
          class="control-button"
          :class="{
            'control-button--active': screenShareState === 'sharing',
            'control-button--loading': screenShareState === 'requesting',
          }"
          :aria-label="screenShareState === 'sharing' ? 'Stop screen sharing' : 'Share screen'"
          :aria-pressed="screenShareState === 'sharing'"
          :aria-busy="screenShareState === 'requesting'"
          :disabled="screenShareState === 'requesting'"
          @click="emit('toggleScreenShare')"
        >
          <svg
            v-if="screenShareState === 'requesting'"
            class="control-button__spinner"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4M8 9l4-4 4 4M12 5v8" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip text="Leave room">
        <button
          type="button"
          class="control-button control-button--disconnect"
          aria-label="Leave room"
          @click="emit('leave')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.6 10.8a15.4 15.4 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.5 11.5 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.5 11.5 0 0 0 .6 3.6 1 1 0 0 1-.3 1Z" />
          </svg>
        </button>
      </Tooltip>
    </div>
  </footer>
</template>

<style scoped>
.voice-controls,
.voice-controls__identity,
.voice-controls__actions,
.control-button {
  display: flex;
  align-items: center;
}

.voice-controls {
  justify-content: space-between;
  gap: var(--space-2);
  min-height: calc(var(--size-control-lg) + var(--space-2));
  border-top: var(--stroke-default) solid var(--color-border-default);
  padding: var(--space-2);
  background: var(--color-surface-elevated);
}

.voice-controls__identity {
  min-width: 0;
  gap: var(--space-2);
}

.voice-controls__user {
  display: grid;
  min-width: 0;
}

.voice-controls__user strong,
.voice-controls__user span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.voice-controls__user strong {
  color: var(--color-content-primary);
  font-size: var(--font-size-sm);
}

.voice-controls__user span {
  color: var(--color-presence-online);
  font-size: var(--font-size-xs);
}

.voice-controls__user .voice-controls__status--muted {
  color: var(--color-content-secondary);
}

.voice-controls__actions {
  flex: none;
  gap: var(--space-1);
}

.control-button {
  justify-content: center;
  width: var(--size-control-sm);
  height: var(--size-control-sm);
  border: var(--stroke-default) solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-content-secondary);
  background: transparent;
  cursor: pointer;
  transition:
    color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

.control-button:hover:not(:disabled) {
  color: var(--color-content-primary);
  background: color-mix(
    in srgb,
    var(--color-content-primary) 14%,
    var(--color-surface-elevated)
  );
}

.control-button--muted {
  color: var(--color-status-danger);
  background: color-mix(in srgb, var(--color-status-danger) 14%, transparent);
}

.control-button--muted:hover:not(:disabled) {
  color: var(--color-status-danger);
  background: color-mix(in srgb, var(--color-status-danger) 22%, transparent);
}

.control-button--active {
  color: var(--color-media-sharing);
  background: color-mix(in srgb, var(--color-accent-emphasis) 18%, transparent);
}

.control-button--active:hover:not(:disabled) {
  color: var(--color-media-sharing);
  background: color-mix(in srgb, var(--color-accent-emphasis) 28%, transparent);
}

.control-button:disabled {
  color: var(--color-content-secondary);
  cursor: wait;
}

.control-button:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}

.control-button svg {
  width: var(--size-icon-sm);
  height: var(--size-icon-sm);
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.control-button__spinner {
  animation: control-spin 800ms linear infinite;
  stroke-dasharray: 42 16;
}

.control-button--disconnect {
  color: var(--color-status-danger);
}

.control-button--disconnect svg {
  transform: rotate(135deg);
  transform-origin: center;
}

.control-button--disconnect:hover:not(:disabled) {
  color: var(--color-status-danger);
  background: color-mix(in srgb, var(--color-status-danger) 22%, transparent);
}

@keyframes control-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .control-button {
    transition: none;
  }

  .control-button__spinner {
    animation-duration: 1.6s;
  }
}
</style>
