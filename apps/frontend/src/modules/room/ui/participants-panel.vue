<script setup lang="ts">
import type { ParticipantDto } from '@holocomm/protocol'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'

import { Avatar, ScrollArea, Slider, Switch } from '#/ui/primitives'

import type { ParticipantAudioSettings } from '../application/use-room-session.ts'

defineProps<{
  audioSettings: Readonly<Record<string, ParticipantAudioSettings>>
  canConfigureAudio: boolean
  participants: readonly ParticipantDto[]
  selfId?: string
  speakingIds: ReadonlySet<string>
}>()

const emit = defineEmits<{
  setVolume: [participantId: string, volume: number]
  toggleMute: [participantId: string]
}>()

function volumePercent(settings: ParticipantAudioSettings | undefined): number {
  return Math.round((settings?.volume ?? 1) * 100)
}

function setVolume(participantId: string, percent: number): void {
  emit('setVolume', participantId, percent / 100)
}
</script>

<template>
  <aside class="participants" aria-labelledby="participants-title">
    <header class="participants__header">
      <h2 id="participants-title">Participants</h2>
      <span>{{ participants.length }}</span>
    </header>
    <ScrollArea class="participants__scroll">
      <ul class="participants__list">
        <li
          v-for="participant in participants"
          :key="participant.id"
          class="participant-item"
        >
          <div
            class="participant"
            :class="{
              'participant--speaking': !participant.microphoneMuted
                && speakingIds.has(participant.id),
            }"
          >
            <Avatar class="participant__avatar" :name="participant.displayName" size="sm" />
            <span class="participant__name">
              {{ participant.displayName }}
              <small v-if="participant.id === selfId">you</small>
            </span>
            <span class="participant__statuses">
              <svg
                v-if="participant.screenSharing"
                class="participant__status participant__status--sharing"
                viewBox="0 0 16 16"
                role="img"
                aria-label="Sharing screen"
              >
                <rect x="1.5" y="2" width="13" height="9" rx="1.5" />
                <path d="M5 14h6M8 11v3" />
              </svg>
              <svg
                v-if="participant.microphoneMuted"
                class="participant__status participant__status--muted"
                viewBox="0 0 16 16"
                role="img"
                aria-label="Microphone muted"
              >
                <path d="M6 6v1a2 2 0 0 0 3.4 1.4M10 5V3a2 2 0 0 0-3.7-1M3 7a5 5 0 0 0 8.4 3.7M8 12v3M5 15h6M1.5 1.5l13 13" />
              </svg>
              <svg
                v-if="canConfigureAudio && audioSettings[participant.id]?.muted"
                class="participant__status participant__status--local-muted"
                viewBox="0 0 16 16"
                role="img"
                aria-label="Muted locally"
              >
                <path d="M2 6h3l3-3v10l-3-3H2zM10.5 6.2a3 3 0 0 1 0 3.6M12.5 4.2a6 6 0 0 1 0 7.6M1.5 1.5l13 13" />
              </svg>
            </span>
            <PopoverRoot v-if="canConfigureAudio && participant.id !== selfId">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="participant__settings-button"
                  :aria-label="`Audio settings for ${participant.displayName}`"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M2 5h8M13 5h1M2 11h2M7 11h7M10 3v4M4 9v4" />
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverPortal>
                <PopoverContent
                  class="participant-audio"
                  align="start"
                  side="right"
                  :side-offset="8"
                >
                  <div class="participant-audio__volume">
                    <div class="participant-audio__heading">
                      <span>Volume</span>
                      <output>{{ volumePercent(audioSettings[participant.id]) }}%</output>
                    </div>
                    <Slider
                      accessible-label="Participant volume"
                      :model-value="volumePercent(audioSettings[participant.id])"
                      @update:model-value="(volume) => setVolume(participant.id, volume)"
                    />
                  </div>
                  <div class="participant-audio__mute">
                    <Switch
                      label="Mute locally"
                      :model-value="audioSettings[participant.id]?.muted ?? false"
                      @update:model-value="emit('toggleMute', participant.id)"
                    />
                  </div>
                </PopoverContent>
              </PopoverPortal>
            </PopoverRoot>
          </div>
        </li>
      </ul>
    </ScrollArea>
  </aside>
</template>

<style scoped>
.participants {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  background: var(--color-surface-panel);
}

.participants__header,
.participant {
  display: flex;
  align-items: center;
}

.participants__header {
  justify-content: space-between;
  padding: var(--space-4);
}

h2 {
  margin: 0;
  font-size: var(--font-size-md);
}

.participants__header > span {
  color: var(--color-content-secondary);
  font-size: var(--font-size-sm);
}

.participants__scroll {
  min-height: 0;
}

.participants__list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0 var(--space-3) var(--space-4);
  list-style: none;
}

.participant-item {
  overflow: hidden;
  border-radius: var(--radius-md);
}

.participant {
  gap: var(--space-3);
  min-height: var(--size-control-lg);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
}

.participant:hover {
  background: var(--color-action-neutral-background-hover);
}

.participant__avatar {
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.participant--speaking .participant__avatar {
  box-shadow:
    0 0 0 var(--stroke-focus-offset) var(--color-surface-panel),
    0 0 0 calc(var(--stroke-focus) + var(--stroke-focus-offset)) var(--color-presence-speaking);
}

.participant__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

small {
  color: var(--color-content-secondary);
}

.participant__statuses {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: auto;
}

.participant__status,
.participant__settings-button svg {
  width: var(--size-icon-sm);
  height: var(--size-icon-sm);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.participant__status--sharing {
  color: var(--color-media-sharing);
}

.participant__status--muted {
  color: var(--color-content-secondary);
}

.participant__status--local-muted {
  color: var(--color-status-danger);
}

.participant__settings-button {
  display: grid;
  width: var(--size-control-sm);
  height: var(--size-control-sm);
  flex: none;
  place-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  padding: 0;
  color: var(--color-content-secondary);
  background: transparent;
  cursor: pointer;
}

.participant__settings-button:hover,
.participant__settings-button[data-state='open'] {
  color: var(--color-content-primary);
  background: color-mix(in srgb, var(--color-content-primary) 12%, transparent);
}

.participant__settings-button:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}
</style>

<!-- PopoverContent is teleported outside this component, so these styles must be global. -->
<style>
.participant-audio {
  z-index: var(--layer-tooltip);
  display: grid;
  width: min(15rem, calc(100vw - var(--space-8)));
  gap: var(--space-3);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  color: var(--color-content-primary);
  background: var(--color-surface-elevated);
  box-shadow: 0 var(--space-2) var(--space-6) var(--color-shadow);
}

.participant-audio:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}

.participant-audio__volume {
  display: grid;
}

.participant-audio__volume {
  gap: var(--space-2);
}

.participant-audio__heading {
  display: flex;
  justify-content: space-between;
  color: var(--color-content-primary);
  font-size: var(--font-size-sm);
}

.participant-audio__heading output {
  color: var(--color-content-secondary);
}

.participant-audio__mute {
  border-top: var(--stroke-default) solid var(--color-border-default);
  padding-top: var(--space-2);
}
</style>
