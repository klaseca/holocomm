<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import ChatPanel from '#/modules/chat/ui/chat-panel.vue'
import MediaSettingsDialog from '#/modules/rtc/ui/media-settings-dialog.vue'
import RemoteScreen from '#/modules/rtc/ui/remote-screen.vue'
import { useVoiceActivity } from '#/modules/rtc/ui/use-voice-activity.ts'
import VoiceControls from '#/modules/rtc/ui/voice-controls.vue'
import { Button } from '#/ui/primitives'

import { type RoomPreviewState, useRoomPreview } from '../application/use-room-preview.ts'
import { type ConnectionState, roomSessionContext } from '../application/use-room-session.ts'
import ParticipantsPanel from './participants-panel.vue'

const props = defineProps<{
  initialDisplayName: string
  slug: string
}>()

const emit = defineEmits<{ leave: [] }>()

const session = roomSessionContext.inject()

const preview = useRoomPreview(props.slug, session.webSocketUrl)

const displayName = ref(props.initialDisplayName)

const copyLabel = ref('Copy invite')

const mediaSettingsOpen = ref(false)

const activeRoom = computed(() => session.roomSlug.value === props.slug)

const connected = computed(() => activeRoom.value && session.connectionState.value === 'connected')

const previewing = computed(() => !activeRoom.value || session.connectionState.value === 'idle')

const connectionLabel = computed(() =>
  previewing.value
    ? describePreview(preview.state.value, preview.participants.value.length)
    : describeConnection(session.connectionState.value),
)

const connectionClass = computed(() =>
  previewing.value ? preview.state.value : session.connectionState.value,
)

const emptySpeakingIds = new Set<string>()

const emptyAudioSettings = {}

const voiceStreams = computed<Record<string, MediaStream>>(() => {
  const streams = { ...session.remoteAudioStreams.value }

  const selfId = session.self.value?.id

  const localStream = session.localAudioStream.value

  if (selfId != null && localStream != null) {
    streams[selfId] = localStream
  }

  return streams
})

const detectedSpeakingIds = useVoiceActivity(voiceStreams)

const speakingIds = computed<ReadonlySet<string>>(
  () =>
    new Set(
      [...detectedSpeakingIds.value].filter(
        participantId =>
          !session.participants.value.find(participant => participant.id === participantId)
            ?.microphoneMuted,
      ),
    ),
)

const screenShares = computed(() => {
  const shares = Object.entries(session.remoteScreenStreams.value)
    .filter(([peerId]) => session.participants.value.some(
      participant => participant.id === peerId && participant.screenSharing,
    ))
    .map(([peerId, stream]) => ({
      id: peerId,
      label: participantName(peerId),
      local: false,
      stream,
    }))

  const localStream = session.localScreenStream.value

  if (localStream != null) {
    shares.unshift({
      id: session.self.value?.id ?? 'self',
      label: 'Your screen',
      local: true,
      stream: localStream,
    })
  }

  return shares
})

function join(): void {
  if (displayName.value === '') {
    return
  }

  preview.stop()
  session.connect(props.slug, displayName.value)
}

function leaveRoom(): void {
  preview.stop()
  emit('leave')
}

function cancelConnectionAndLeave(): void {
  session.leave()
  preview.stop()
  emit('leave')
}

function disconnectFromCall(): void {
  session.leave()
  preview.watch()
}

function sendChat(content: string, acknowledge: (sent: boolean) => void): void {
  acknowledge(session.sendChat(content))
}

function participantName(peerId: string): string {
  return (
    session.participants.value.find(participant => participant.id === peerId)?.displayName
    ?? 'Shared screen'
  )
}

async function copyInvite(): Promise<void> {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copyLabel.value = 'Copied'
    window.setTimeout(() => (copyLabel.value = 'Copy invite'), 1_500)
  } catch {
    copyLabel.value = 'Copy failed'
  }
}

function describeConnection(state: ConnectionState): string {
  switch (state) {
    case 'idle':
      return 'Waiting to join'
    case 'connecting':
      return 'Connecting'
    case 'joining':
      return 'Joining room'
    case 'reconnecting':
      return 'Reconnecting'
    case 'connected':
      return 'Connected'
    case 'disconnected':
      return 'Disconnected'
    case 'error':
      return 'Connection error'
  }
}

function describePreview(state: RoomPreviewState, participantCount: number): string {
  switch (state) {
    case 'idle':
      return 'Preview'
    case 'connecting':
      return 'Loading room'
    case 'connected':
      return `${participantCount} connected`
    case 'reconnecting':
      return 'Refreshing room'
    case 'error':
      return 'Preview unavailable'
  }
}

onMounted(() => {
  if (!activeRoom.value) {
    preview.watch()
  }
})
</script>

<template>
  <main class="room">
    <header class="room__header">
      <div>
        <p class="room__label">Room</p>
        <h1>{{ slug }}</h1>
      </div>
      <div class="room__header-actions">
        <span class="connection" :class="`connection--${connectionClass}`">
          {{ connectionLabel }}
        </span>
        <Button size="sm" variant="secondary" @click="copyInvite">{{ copyLabel }}</Button>
      </div>
    </header>

    <div v-if="previewing" class="room__workspace">
      <div class="room__sidebar room__sidebar--preview">
        <ParticipantsPanel
          :audio-settings="emptyAudioSettings"
          :can-configure-audio="false"
          :participants="preview.participants.value"
          :speaking-ids="emptySpeakingIds"
        />
      </div>
      <section class="room-preview">
        <div class="room-preview__card">
          <p class="eyebrow">Voice room</p>
          <h2>Join when you’re ready</h2>
          <p v-if="preview.error.value" class="room-preview__error" role="status">
            {{ preview.error.value }}
          </p>
          <p v-else-if="preview.participants.value.length === 0">
            No one is connected yet. You can be the first.
          </p>
          <p v-else>
            {{ preview.participants.value.length }}
            {{ preview.participants.value.length === 1 ? 'person is' : 'people are' }}
            currently connected.
          </p>
          <div class="room-preview__actions">
            <Button @click="join">Join room</Button>
            <Button variant="secondary" @click="leaveRoom">Back home</Button>
          </div>
        </div>
      </section>
    </div>

    <div v-else-if="!connected" class="connection-screen" role="status">
      <span class="connection-screen__pulse"></span>
      <h2>{{ connectionLabel }}</h2>
      <p v-if="session.error.value">{{ session.error.value }}</p>
      <p v-else>Establishing the live room session…</p>
      <div class="connection-screen__actions">
        <Button
          v-if="
            session.connectionState.value === 'error'
              || session.connectionState.value === 'disconnected'
          "
          @click="join"
        >
          Try again
        </Button>
        <Button variant="secondary" @click="cancelConnectionAndLeave">Back home</Button>
      </div>
    </div>

    <template v-else>
      <div class="room__workspace">
        <div class="room__sidebar">
          <ParticipantsPanel
            :audio-settings="session.participantAudioSettings.value"
            :can-configure-audio="true"
            :participants="session.participants.value"
            :self-id="session.self.value?.id"
            :speaking-ids="speakingIds"
            @set-volume="session.setParticipantVolume"
            @toggle-mute="session.toggleParticipantMuted"
          />
          <VoiceControls
            :display-name="session.self.value?.displayName ?? displayName"
            :microphone-state="session.microphoneState.value"
            :screen-share-state="session.screenShareState.value"
            @leave="disconnectFromCall"
            @open-media-settings="mediaSettingsOpen = true"
            @toggle-microphone="session.toggleMicrophone"
            @toggle-screen-share="session.toggleScreenShare"
          />
        </div>
        <section
          class="room__content"
          :class="{ 'room__content--sharing': screenShares.length > 0 }"
        >
          <div v-if="screenShares.length > 0" class="screen-previews" aria-label="Shared screens">
            <RemoteScreen
              v-for="share in screenShares"
              :key="share.id"
              :label="share.label"
              :muted="
                share.local || session.participantAudioSettings.value[share.id]?.muted === true
              "
              :stream="share.stream"
              :volume="session.participantAudioSettings.value[share.id]?.volume ?? 1"
            />
          </div>
          <ChatPanel
            class="room__chat"
            :can-send="connected"
            :messages="session.messages.value"
            :self-id="session.self.value?.id"
            @send="sendChat"
          />
        </section>
      </div>
      <div
        v-if="
          session.error.value
            || session.rtcError.value
            || session.microphoneError.value
            || session.screenShareError.value
        "
        class="room__media-error"
        role="alert"
      >
        <p v-if="session.error.value">{{ session.error.value }}</p>
        <p v-if="session.rtcError.value">{{ session.rtcError.value }}</p>
        <p v-if="session.microphoneError.value">{{ session.microphoneError.value }}</p>
        <p v-if="session.screenShareError.value">{{ session.screenShareError.value }}</p>
      </div>
    </template>
  </main>
  <MediaSettingsDialog v-model="mediaSettingsOpen" />
</template>

<style scoped>
.room {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100vh;
  min-height: 36rem;
  overflow: hidden;
  background: var(--color-surface-inset);
}

.room__header,
.room__header-actions,
.room-preview__actions,
.connection-screen__actions {
  display: flex;
  align-items: center;
}

.room__header {
  justify-content: space-between;
  min-height: calc(var(--size-control-lg) + var(--space-3));
  border-bottom: var(--stroke-default) solid var(--color-border-default);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface-panel);
}

.room__label,
.eyebrow,
.stage p,
.connection-screen p {
  margin: 0;
  color: var(--color-content-secondary);
}

.room__label,
.eyebrow {
  color: var(--color-content-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: var(--font-size-lg);
}

.room__header-actions {
  gap: var(--space-3);
}

.connection {
  color: var(--color-content-secondary);
  font-size: var(--font-size-sm);
}

.connection--connected {
  color: var(--color-status-success);
}

.connection--reconnecting {
  color: var(--color-status-warning);
}

.connection--error,
.connection--disconnected {
  color: var(--color-status-danger);
}

.room__workspace {
  display: grid;
  grid-template-columns: 20rem minmax(0, 1fr);
  min-height: 0;
}

.room__sidebar {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  border-right: var(--stroke-default) solid var(--color-border-default);
  background: var(--color-surface-panel);
}

.room__media-error {
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface-elevated);
  color: var(--color-status-danger);
  text-align: center;
}

.room-preview {
  display: grid;
  min-width: 0;
  place-items: center;
  padding: var(--space-8);
  background: var(--color-surface-inset);
}

.room-preview__card {
  display: grid;
  width: min(100%, var(--layout-dialog-max));
  gap: var(--space-4);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  background: var(--color-surface-panel);
}

.room-preview__card > p {
  margin: 0;
  color: var(--color-content-secondary);
}

.room-preview__error {
  color: var(--color-status-danger) !important;
}

.room__media-error p {
  margin: 0;
}

.room__content {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: 'chat';
  min-width: 0;
  min-height: 0;
}

.room__content--sharing {
  grid-template-columns: minmax(0, 1fr) clamp(16rem, 24vw, 22rem);
  grid-template-areas: 'chat previews';
}

.room__chat {
  grid-area: chat;
  min-height: 0;
  overflow: hidden;
}

.screen-previews {
  grid-area: previews;
  display: grid;
  align-content: start;
  min-height: 0;
  gap: var(--space-3);
  overflow-y: auto;
  border-left: var(--stroke-default) solid var(--color-border-default);
  padding: var(--space-3);
  background: var(--color-surface-inset);
}

.connection-screen {
  display: grid;
  place-items: center;
}

.connection-screen {
  align-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  text-align: center;
}

.connection-screen__pulse {
  width: var(--space-4);
  height: var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-presence-online);
  box-shadow: 0 0 0 var(--space-3) var(--color-action-neutral-background-rest);
}

.connection-screen__actions,
.room-preview__actions {
  gap: var(--space-2);
}

@media (max-width: 60rem) {
  .room__workspace {
    grid-template-columns: 14rem 1fr;
  }

  .room__content--sharing {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      'chat'
      'previews';
  }

  .screen-previews {
    max-height: 13rem;
    overflow-x: auto;
    overflow-y: hidden;
    border-top: var(--stroke-default) solid var(--color-border-default);
    border-left: 0;
    grid-auto-columns: minmax(15rem, 19rem);
    grid-auto-flow: column;
  }
}
</style>
