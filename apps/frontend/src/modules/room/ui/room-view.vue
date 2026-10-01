<script setup lang="ts">
import type { ParticipantDto } from '@holocomm/protocol'
import { computed, ref, useTemplateRef, watch } from 'vue'

import { ChatPanel } from '#/modules/chat/ui/chat-panel.vue'
import { NavigationTrigger } from '#/modules/identity/ui/navigation-trigger.vue'
import { RemoteScreen } from '#/modules/rtc/ui/remote-screen.vue'
import { useVoiceActivity } from '#/modules/rtc/ui/use-voice-activity.ts'
import { VoiceControls } from '#/modules/rtc/ui/voice-controls.vue'
import { Button, IconButton, Tooltip } from '#/ui/primitives'
import { useResponsiveDialog } from '#/ui/use-responsive-dialog.ts'

import { useRoomPreview } from '../application/use-room-preview.ts'
import { type ConnectionState, roomSessionContext } from '../application/use-room-session.ts'
import { callControlsContext } from './call-controls-context.ts'
import { ParticipantsPanel } from './participants-panel.vue'

const props = defineProps<{
  initialDisplayName: string
  slug: string
}>()

const emit = defineEmits<{ leave: [] }>()

const session = roomSessionContext.inject()

const callControls = callControlsContext.inject()

const preview = useRoomPreview(props.slug, session.webSocketUrl)

const joiningParticipants = ref<readonly ParticipantDto[]>([])

const displayName = ref(props.initialDisplayName)

const copyLabel = ref('Copy invite')

const participantsOpen = ref(false)

const participantsDialog = useTemplateRef<HTMLDialogElement>('participantsDialog')

let participantsTrigger: HTMLElement | undefined

function openParticipants(event: MouseEvent): void {
  participantsTrigger = event.currentTarget as HTMLElement
  participantsOpen.value = true
}

function restoreParticipantsFocus(): void {
  const trigger = participantsTrigger?.isConnected
    && participantsTrigger.getClientRects().length > 0
    ? participantsTrigger
    : document.querySelector<HTMLElement>('.room__copy-button')

  trigger?.focus({ preventScroll: true })
}

const participantsModal = useResponsiveDialog(
  participantsDialog,
  callControls.compact,
  participantsOpen,
  restoreParticipantsFocus,
)

const activeRoom = computed(() => session.roomSlug.value === props.slug)

const connected = computed(() => activeRoom.value && session.connectionState.value === 'connected')

const visibleParticipants = computed(() => {
  if (!activeRoom.value) {
    return preview.participants.value
  }

  return session.participants.value.length > 0
    ? session.participants.value
    : joiningParticipants.value
})

const previewing = computed(() => !activeRoom.value || session.connectionState.value === 'idle')

const connectionLabel = computed(() => describeConnection(session.connectionState.value))

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

  if (previewing.value) {
    joiningParticipants.value = [...preview.participants.value]
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

watch(previewing, (enabled) => {
  if (enabled) {
    preview.watch()
  } else {
    preview.stop()
  }
}, { immediate: true })
</script>

<template>
  <main class="room">
    <header class="room__header">
      <NavigationTrigger />
      <div class="room__heading">
        <p class="room__label">Room</p>
        <h1 :title="slug">{{ slug }}</h1>
      </div>
      <div class="room__header-actions">
        <Tooltip :text="`Participants · ${visibleParticipants.length}`">
          <Button
            class="room__participants-button"
            size="sm"
            variant="secondary"
            :aria-label="`Show participants, ${visibleParticipants.length} people`"
            aria-haspopup="dialog"
            :aria-expanded="participantsOpen"
            @click="openParticipants"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="9" cy="8" r="3" />
              <path d="M3 20v-2a6 6 0 0 1 12 0v2H3Zm13-14a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5h-4" />
            </svg>
            <span aria-hidden="true">{{ visibleParticipants.length }}</span>
          </Button>
        </Tooltip>
        <Tooltip :text="copyLabel">
          <IconButton class="room__copy-button" :label="copyLabel" @click="copyInvite">
            <svg v-if="copyLabel === 'Copied'" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4 12 5 5L20 6" />
            </svg>
            <svg v-else-if="copyLabel === 'Copy failed'" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6m0 4h.01" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            </svg>
          </IconButton>
        </Tooltip>
        <span v-if="copyLabel !== 'Copy invite'" class="room__copy-announcement" role="status">
          {{ copyLabel }}
        </span>
      </div>
    </header>

    <div class="room__workspace">
      <div class="room__sidebar">
        <Teleport
          :disabled="!callControls.compact.value"
          :to="participantsDialog ?? 'body'"
        >
          <ParticipantsPanel
            :audio-settings="
              connected ? session.participantAudioSettings.value : emptyAudioSettings
            "
            :can-configure-audio="connected"
            :participants="visibleParticipants"
            :portal-target="
              callControls.compact.value ? participantsDialog ?? undefined : undefined
            "
            :self-id="connected ? session.self.value?.id : undefined"
            :speaking-ids="connected ? speakingIds : emptySpeakingIds"
            @set-volume="session.setParticipantVolume"
            @toggle-mute="session.toggleParticipantMuted"
          />
        </Teleport>
        <VoiceControls
          v-if="callControls.docked.value"
          layout="panel"
          :connected="connected"
          :connection-label="connectionLabel"
          :display-name="session.self.value?.displayName ?? displayName"
          :microphone-state="session.microphoneState.value"
          :screen-share-state="session.screenShareState.value"
          @leave="session.leave"
          @open-media-settings="callControls.openMediaSettings"
          @toggle-microphone="session.toggleMicrophone"
          @toggle-screen-share="session.toggleScreenShare"
        />
      </div>
      <section v-if="previewing" class="room-preview">
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
          <p v-if="session.roomSlug.value != null && !activeRoom">
            You’re in {{ session.roomSlug.value }}. Joining this room will leave that call.
          </p>
          <div class="room-preview__actions">
            <Button @click="join">
              {{ session.roomSlug.value != null && !activeRoom ? 'Switch to this room' : 'Join room' }}
            </Button>
            <Button variant="secondary" @click="leaveRoom">Back home</Button>
          </div>
        </div>
      </section>
      <section v-else-if="!connected" class="connection-screen" role="status">
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
      </section>
      <section
        v-else
        class="room__content"
        :class="{ 'room__content--sharing': screenShares.length > 0 }"
      >
        <div v-if="screenShares.length > 0" class="screen-previews" aria-label="Shared screens">
          <RemoteScreen
            v-for="share in screenShares"
            :key="share.id"
            class="screen-preview"
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
        connected
          && (
            session.error.value
            || session.rtcError.value
            || session.microphoneError.value
            || session.screenShareError.value
          )
      "
      class="room__media-error"
      role="alert"
    >
      <p v-if="session.error.value">{{ session.error.value }}</p>
      <p v-if="session.rtcError.value">{{ session.rtcError.value }}</p>
      <p v-if="session.microphoneError.value">{{ session.microphoneError.value }}</p>
      <p v-if="session.screenShareError.value">{{ session.screenShareError.value }}</p>
    </div>
  </main>
  <dialog
    ref="participantsDialog"
    class="room-participants-dialog"
    aria-label="Room participants"
    @cancel="participantsModal.cancel"
    @click="participantsModal.closeOnBackdrop"
  >
    <IconButton
      class="room-participants-dialog__close"
      label="Close participants"
      @click="participantsOpen = false"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 3l10 10M13 3 3 13" />
      </svg>
    </IconButton>
  </dialog>
</template>

<style scoped>
.room {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-color-inset);
}

.room__header,
.room__header-actions,
.room-preview__actions,
.connection-screen__actions {
  display: flex;
  align-items: center;
}

.room__header {
  min-width: 0;
  flex-wrap: nowrap;
  justify-content: space-between;
  gap: var(--base-size-12);
  min-height: calc(var(--control-xlarge-size) + var(--base-size-12));
  border-bottom: var(--border-width-thin) solid var(--border-color-default);
  padding: var(--base-size-8) var(--base-size-16);
  background: var(--bg-color-muted);
}

.room__label,
.eyebrow,
.connection-screen p {
  margin: 0;
  color: var(--fg-color-muted);
}

.room__label,
.eyebrow {
  color: var(--fg-color-accent);
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: var(--text-title-size-medium);
}

.room__header-actions {
  flex: none;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: var(--base-size-12);
}

.room__participants-button {
  display: none;
  min-width: var(--base-size-44);
  min-height: var(--base-size-44);
  gap: var(--base-size-4);
  padding-inline: var(--base-size-8);
}

.room__heading {
  min-width: 0;
  flex: 1;
}

.room__header h1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room__participants-button svg {
  width: var(--base-size-16);
  height: var(--base-size-16);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.room__copy-button {
  width: var(--base-size-44);
  min-height: var(--base-size-44);
}

.room__copy-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.room__workspace {
  display: grid;
  grid-template-columns: clamp(14rem, 20vw, 18rem) minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.room__sidebar {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  border-right: var(--border-width-thin) solid var(--border-color-default);
  background: var(--bg-color-muted);
}

.room__media-error {
  padding: var(--base-size-8) var(--base-size-16);
  background: var(--overlay-bg-color);
  color: var(--fg-color-danger);
  text-align: center;
}

.room-preview {
  display: grid;
  min-width: 0;
  min-height: 0;
  align-content: safe center;
  justify-items: center;
  overflow-y: auto;
  padding: var(--base-size-32);
  background: var(--bg-color-inset);
}

.room-preview__card {
  display: grid;
  width: min(100%, var(--overlay-width-medium));
  gap: var(--base-size-16);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  padding: var(--base-size-24);
  background: var(--bg-color-muted);
}

.room-preview__card > p {
  margin: 0;
  color: var(--fg-color-muted);
}

.room-preview__error {
  color: var(--fg-color-danger) !important;
}

.room__media-error p {
  margin: 0;
}

.room__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.room__content--sharing {
  grid-template-columns: minmax(0, 1fr) clamp(14rem, 22vw, 20rem);
}

.room__chat {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.screen-previews {
  display: grid;
  grid-column: 2;
  grid-row: 1;
  align-content: start;
  min-width: 0;
  min-height: 0;
  gap: var(--base-size-12);
  overflow-y: auto;
  border-left: var(--border-width-thin) solid var(--border-color-default);
  padding: var(--base-size-12);
  background: var(--bg-color-inset);
}

.connection-screen {
  display: grid;
  min-width: 0;
  min-height: 0;
  align-content: safe center;
  justify-items: center;
  gap: var(--base-size-12);
  overflow-y: auto;
  padding: var(--base-size-32);
  text-align: center;
}

.connection-screen__actions,
.room-preview__actions {
  gap: var(--base-size-8);
}

@container application (inline-size < 72rem) {
  .room__header {
    gap: var(--base-size-8);
    padding: var(--base-size-8) var(--base-size-12);
  }

  .room__label {
    display: none;
  }

  .room__header h1 {
    font-size: var(--text-body-size-large);
  }

  .room__header-actions {
    flex: none;
    flex-wrap: nowrap;
    gap: var(--base-size-8);
  }

  .room-preview,
  .connection-screen {
    padding: var(--base-size-16);
  }

  .room-preview__card {
    padding: var(--base-size-16);
  }
}

@container application (inline-size < 48rem) {
  .room__participants-button {
    display: inline-flex;
  }

  .room__workspace {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
  }

  .room__sidebar {
    display: none;
  }

  .room-preview,
  .connection-screen,
  .room__content {
    grid-row: 1;
  }
}

@container page (inline-size < 64rem) {
  .room__content--sharing {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(8rem, min(45%, 14rem)) minmax(0, 1fr);
  }

  .room__content--sharing .screen-previews {
    display: flex;
    grid-column: 1;
    grid-row: 1;
    overflow-x: auto;
    overflow-y: hidden;
    border-bottom: var(--border-width-thin) solid var(--border-color-default);
    border-left: 0;
  }

  .room__content--sharing .screen-preview {
    flex: 0 0 min(85%, 20rem);
  }

  .room__content--sharing .room__chat {
    grid-row: 2;
  }
}

@container page (inline-size < 22rem) {
  .room-preview__actions {
    flex-wrap: wrap;
    width: 100%;
  }

  .room-preview__actions > * {
    flex: 1 1 100%;
  }
}

@media (max-height: 25rem) {
  .room-preview,
  .connection-screen {
    padding: var(--base-size-8);
  }

  .room-preview__card {
    gap: var(--base-size-8);
    padding: var(--base-size-12);
  }

  @container page (inline-size < 22rem) {
    .room__content--sharing {
      grid-template-rows: 5rem minmax(4rem, 1fr);
      overflow-y: auto;
    }

    .room__content--sharing .room__chat {
      min-height: 4rem;
    }
  }

  @container page (inline-size >= 22rem) and (inline-size < 48rem) {
    .room__content--sharing {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: minmax(0, 1fr);
    }

    .room__content--sharing .screen-previews {
      grid-column: 1;
      grid-row: 1;
      border-right: var(--border-width-thin) solid var(--border-color-default);
      border-bottom: 0;
    }

    .room__content--sharing .screen-preview {
      flex-basis: 100%;
    }

    .room__content--sharing .room__chat {
      grid-column: 2;
      grid-row: 1;
    }
  }
}
</style>

<style>
.room-participants-dialog {
  position: fixed;
  top: auto;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  width: min(100vw, 32rem);
  height: fit-content;
  max-height: min(75dvh, 32rem);
  margin: 0 auto;
  overflow: hidden;
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
  padding: 0 0 env(safe-area-inset-bottom);
  color: var(--fg-color-default);
  background: var(--bg-color-muted);
}

.room-participants-dialog:not([open]) {
  display: none;
}

.room-participants-dialog::backdrop {
  background: var(--overlay-backdrop-bg-color);
}

.room-participants-dialog__close {
  position: absolute;
  z-index: 1;
  top: var(--base-size-8);
  right: var(--base-size-8);
  width: var(--base-size-44);
  height: var(--base-size-44);
}

.room-participants-dialog .participants__header {
  padding-inline-end: calc(var(--base-size-44) + var(--base-size-16));
}
</style>
