import { createApp, watch } from 'vue'

import App from './app/app.vue'
import { createAppRouter } from './app/router.ts'
import {
  createLocalUserState,
  localUserStateContext,
} from './modules/identity/application/local-user-state.ts'
import {
  createThemeState,
  themeStateContext,
} from './modules/preferences/application/theme-state.ts'
import {
  createRoomSession,
  roomSessionContext,
} from './modules/room/application/use-room-session.ts'
import {
  createLocalMediaSettings,
  localMediaSettingsContext,
  resolveMediaPreferences,
} from './modules/rtc/application/media-settings.ts'
import { loadRuntimeConfig } from './shared/config/runtime-config.ts'

import '@holocomm/design-tokens/tokens.css'
import './style.css'

async function bootstrap(): Promise<void> {
  const userState = createLocalUserState(window.localStorage)

  const mediaSettings = createLocalMediaSettings(window.localStorage)

  const runtimeConfig = await loadRuntimeConfig()

  const roomSession = createRoomSession(runtimeConfig.webSocketUrl, runtimeConfig.iceServers)

  const themeState = createThemeState(
    window.localStorage,
    document.documentElement,
    window.matchMedia('(prefers-color-scheme: dark)'),
  )

  const router = createAppRouter(userState)

  watch(
    mediaSettings.preferences,
    preferences => void roomSession.configureMedia(resolveMediaPreferences(preferences)),
    { immediate: true },
  )

  createApp(App)
    // @ts-expect-error tmp
    .provide(localUserStateContext.key, userState)
    // @ts-expect-error tmp
    .provide(localMediaSettingsContext.key, mediaSettings)
    // @ts-expect-error tmp
    .provide(roomSessionContext.key, roomSession)
    // @ts-expect-error tmp
    .provide(themeStateContext.key, themeState)
    .use(router)
    .mount('#app')
}

void bootstrap().catch(() => {
  document.querySelector('#app')?.replaceChildren(
    document.createTextNode('Could not load application configuration.'),
  )
})
