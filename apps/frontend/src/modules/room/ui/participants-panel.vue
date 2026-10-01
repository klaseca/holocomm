<script setup lang="ts">
import type { ParticipantDto } from '@holocomm/protocol'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { useId } from 'vue'

import { Avatar, ScrollArea, Slider, Switch } from '#/ui/primitives'

import type { ParticipantAudioSettings } from '../application/use-room-session.ts'

withDefaults(
  defineProps<{
    audioSettings: Readonly<Record<string, ParticipantAudioSettings>>
    canConfigureAudio: boolean
    participants: readonly ParticipantDto[]
    portalTarget?: HTMLElement
    selfId?: string
    speakingIds: ReadonlySet<string>
  }>(),
  { portalTarget: undefined, selfId: undefined },
)

const emit = defineEmits<{
  setVolume: [participantId: string, volume: number]
  toggleMute: [participantId: string]
}>()

const headingId = useId()

function volumePercent(settings: ParticipantAudioSettings | undefined): number {
  return Math.round((settings?.volume ?? 1) * 100)
}

function setVolume(participantId: string, percent: number): void {
  emit('setVolume', participantId, percent / 100)
}
</script>

<template>
  <aside class="participants" :aria-labelledby="headingId">
    <header class="participants__header">
      <h2 :id="headingId">Participants</h2>
      <span>{{ participants.length }}</span>
    </header>
    <ScrollArea accessible-label="Room participants" class="participants__scroll">
      <p v-if="participants.length === 0" class="participants__empty">No one is here yet.</p>
      <ul v-else class="participants__list">
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
              <PopoverPortal :to="portalTarget">
                <PopoverContent
                  class="participant-audio"
                  align="end"
                  side="top"
                  :side-offset="8"
                  :collision-padding="16"
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
  background: var(--bg-color-muted);
}

.participants__header,
.participant {
  display: flex;
  align-items: center;
}

.participants__header {
  justify-content: space-between;
  padding: var(--base-size-16);
}

h2 {
  margin: 0;
  font-size: var(--text-body-size-large);
}

.participants__header > span {
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-medium);
}

.participants__scroll {
  min-height: 0;
}

.participants__empty {
  margin: 0;
  padding: var(--base-size-24) var(--base-size-12);
  color: var(--fg-color-muted);
  text-align: center;
}

.participants__list {
  display: grid;
  gap: var(--base-size-8);
  margin: 0;
  padding: 0 var(--base-size-12) var(--base-size-16);
  list-style: none;
}

.participant-item {
  overflow: hidden;
  border-radius: var(--border-radius-default);
}

.participant {
  gap: var(--base-size-12);
  min-height: var(--control-xlarge-size);
  border-radius: var(--border-radius-default);
  padding: var(--base-size-4) var(--base-size-8);
}

.participant:hover {
  background: var(--button-default-bg-color-hover);
}

.participant__avatar {
  transition: box-shadow var(--motion-duration-micro) var(--motion-easing-hover);
}

.participant--speaking .participant__avatar {
  box-shadow: var(--room-participant-speaking-box-shadow);
}

.participant__name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

small {
  color: var(--fg-color-muted);
}

.participant__statuses {
  display: flex;
  align-items: center;
  gap: var(--base-size-4);
  margin-left: auto;
}

.participant__status,
.participant__settings-button svg {
  width: var(--base-size-16);
  height: var(--base-size-16);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.participant__status--sharing {
  color: var(--fg-color-accent);
}

.participant__status--muted {
  color: var(--fg-color-muted);
}

.participant__status--local-muted {
  color: var(--fg-color-danger);
}

.participant__settings-button {
  display: grid;
  width: var(--control-medium-size);
  height: var(--control-medium-size);
  flex: none;
  place-items: center;
  border: 0;
  border-radius: var(--border-radius-medium);
  padding: 0;
  color: var(--fg-color-muted);
  background: transparent;
  cursor: pointer;
}

.participant__settings-button:hover,
.participant__settings-button[data-state='open'] {
  color: var(--fg-color-default);
  background: var(--button-default-bg-color-hover);
}

@media (max-width: 30rem) {
  .participants__list {
    padding-inline: var(--base-size-8);
  }

  .participant {
    display: grid;
    grid-template-columns: var(--control-medium-size) minmax(0, 1fr) auto;
    gap: var(--base-size-4) var(--base-size-8);
    padding-inline: var(--base-size-4);
  }

  .participant__avatar {
    grid-column: 1;
    grid-row: 1 / span 2;
    align-self: start;
  }

  .participant__name {
    grid-column: 2 / -1;
    grid-row: 1;
  }

  .participant__statuses {
    grid-column: 2;
    grid-row: 2;
    margin-left: 0;
  }

  .participant__settings-button {
    grid-column: 3;
    grid-row: 2;
    width: var(--base-size-44);
    height: var(--base-size-44);
  }

}
</style>

<!-- PopoverContent is teleported outside this component, so these styles must be global. -->
<style>
.participant-audio {
  z-index: var(--z-index-popover);
  display: grid;
  width: min(15rem, calc(100vw - var(--base-size-32)));
  gap: var(--base-size-12);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-12);
  color: var(--fg-color-default);
  background: var(--overlay-bg-color);
  box-shadow: var(--shadow-floating-medium);
}

.participant-audio__volume {
  display: grid;
}

.participant-audio__volume {
  gap: var(--base-size-8);
}

.participant-audio__heading {
  display: flex;
  justify-content: space-between;
  color: var(--fg-color-default);
  font-size: var(--text-body-size-medium);
}

.participant-audio__heading output {
  color: var(--fg-color-muted);
}

.participant-audio__mute {
  border-top: var(--border-width-thin) solid var(--border-color-default);
  padding-top: var(--base-size-8);
}
</style>
