import type { Ref } from 'vue'
import { Context } from 'vue-context-ts'

export const callControlsContext = new Context({
  key: Symbol('holocomm:call-controls'),
  defaultValue: Context.valueType<{
    compact: Readonly<Ref<boolean>>
    docked: Readonly<Ref<boolean>>
    openMediaSettings: () => void
  }>(),
})
