import { createRouter, createWebHistory, type Router } from 'vue-router'

import type { LocalUserState } from '../modules/identity/application/local-user-state.ts'
import HomePage from './pages/home-page.vue'
import OnboardingPage from './pages/onboarding-page.vue'
import RoomPage from './pages/room-page.vue'

export function createAppRouter(userState: LocalUserState): Router {
  return createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        name: 'home',
        component: HomePage,
        beforeEnter: () => requireProfile(userState, '/'),
      },
      {
        path: '/onboarding',
        name: 'onboarding',
        component: OnboardingPage,
      },
      {
        path: '/room/:slug',
        name: 'room',
        component: RoomPage,
        props: route => ({ slug: route.params.slug }),
        beforeEnter: to => requireProfile(userState, to.fullPath),
      },
      {
        path: '/:pathMatch(.*)*',
        redirect: { name: 'home' },
      },
    ],
  })
}

function requireProfile(userState: LocalUserState, next: string) {
  if (userState.profile.value != null) {
    return true
  }

  return {
    name: 'onboarding',
    query: next === '/' ? undefined : { next },
  }
}
