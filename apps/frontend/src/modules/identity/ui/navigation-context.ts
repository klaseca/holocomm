import type { Ref } from 'vue'
import { Context } from 'vue-context-ts'

export const navigationContext = new Context({
  key: Symbol('holocomm:navigation'),
  defaultValue: Context.valueType<{
    opened: Readonly<Ref<boolean>>
    show: (trigger: HTMLElement) => void
  }>(),
})
