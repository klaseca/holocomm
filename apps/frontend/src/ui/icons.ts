export const iconNames = [
  'check',
  'chevron-down',
  'circle-alert',
  'copy',
  'ellipsis',
  'loader-circle',
  'menu',
  'mic',
  'mic-off',
  'monitor',
  'monitor-up',
  'phone-off',
  'settings',
  'sliders-horizontal',
  'users',
  'volume-x',
  'x',
] as const

export type IconName = typeof iconNames[number]
