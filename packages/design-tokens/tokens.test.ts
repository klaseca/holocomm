import { readdir, readFile } from 'node:fs/promises'

import { describe, expect, test } from 'vitest'

describe('generated design tokens', () => {
  test('exposes the semantic CSS variables used by application UI', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    expect(css).toContain('--color-surface-canvas:')
    expect(css).toContain('--color-content-primary:')
    expect(css).toContain('--color-action-primary-background-hover:')
    expect(css).toContain('--color-presence-speaking:')
    expect(css).toContain('--color-media-sharing:')
    expect(css).toContain('--space-4:')
    expect(css).toContain('--size-icon-sm:')
    expect(css).toContain('--radius-md:')
    expect(css).toContain('--duration-fast:')
  })

  test('builds Holocomm semantics on the Primer dark-dimmed and light palettes', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    const [darkCss, lightCss] = splitThemeCss(css)

    expect(css).toContain(':root {\n  color-scheme: dark;')
    expect(css).toContain('[data-color-scheme=\'light\'] {\n  color-scheme: light;')
    expect(css).toContain('--color-surface-canvas: var(--bgColor-default);')
    expect(darkCss).toContain('--bgColor-default: var(--base-color-neutral-3);')
    expect(darkCss).toContain('--bgColor-muted: var(--base-color-neutral-4);')
    expect(darkCss).toContain('--control-bgColor-rest: var(--base-color-neutral-5);')
    expect(darkCss).toContain('--base-color-neutral-0: var(--base-color-black);')
    expect(lightCss).toContain('--bgColor-default: var(--base-color-neutral-0);')
    expect(lightCss).toContain('--base-color-neutral-0: var(--base-color-white);')
  })

  test('does not emit references to missing CSS variables', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    const definitions = new Set([...css.matchAll(/^\s*(--[\w-]+):/gm)].map(match => match[1]))

    const missingReferences = [
      ...new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map(match => match[1])),
    ].filter(variable => !definitions.has(variable))

    expect(missingReferences).toEqual([])
  })

  test('provides every design token referenced by frontend styles', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    const frontendStyles = await readStyleSources(
      new URL('../../apps/frontend/src/', import.meta.url),
    )

    const definitions = new Set(
      [...`${css}\n${frontendStyles}`.matchAll(/^\s*(--[\w-]+):/gm)].map(match => match[1]),
    )

    const missingReferences = [
      ...new Set([...frontendStyles.matchAll(/var\((--[\w-]+)/g)].map(match => match[1]!)),
    ].filter(variable => !definitions.has(variable) && !variable.startsWith('--reka-'))

    expect(missingReferences).toEqual([])
  })

  test('does not expose superseded ambiguous semantics or unused palette families', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    expect(css).not.toMatch(/--color-(?:interactive|text|voice)-/)
    expect(css).not.toMatch(/--base-color-(?:coral|orange|pink|purple)-/)
  })

  test('keeps text actions and semantic foregrounds at WCAG AA contrast in both themes', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    const [darkCss, lightCss] = splitThemeCss(css)

    const pairs = [
      ['--color-action-primary-foreground', '--color-action-primary-background-rest'],
      ['--color-action-primary-foreground', '--color-action-primary-background-hover'],
      ['--color-action-primary-foreground', '--color-action-primary-background-active'],
      ['--color-action-danger-foreground', '--color-action-danger-background-rest'],
      ['--color-action-danger-foreground', '--color-action-danger-background-hover'],
      ['--color-action-danger-foreground', '--color-action-danger-background-active'],
      ['--color-content-accent', '--color-surface-canvas'],
      ['--color-status-success', '--color-surface-canvas'],
      ['--color-status-warning', '--color-surface-canvas'],
      ['--color-status-danger', '--color-surface-canvas'],
      ['--color-tooltip-foreground', '--color-tooltip-background'],
    ] as const

    for (const themeCss of [darkCss, lightCss]) {
      const variables = parseVariables(themeCss)

      for (const [foreground, background] of pairs) {
        expect(
          contrast(resolveColor(foreground, variables), resolveColor(background, variables)),
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

type Rgb = readonly [number, number, number]

function splitThemeCss(css: string): readonly [string, string] {
  const [darkCss, lightCss] = css.split('[data-color-scheme=\'light\']')

  if (darkCss === undefined || lightCss === undefined) {
    throw new Error('Expected generated CSS to contain dark and light themes')
  }

  return [darkCss, lightCss]
}

function parseVariables(css: string): ReadonlyMap<string, string> {
  return new Map(
    [...css.matchAll(/^\s*(--[\w-]+):([^;\r\n]+);/gm)].map(
      match => [match[1]!, match[2]!.trim()] as const,
    ),
  )
}

async function readStyleSources(directory: URL): Promise<string> {
  const contents: string[] = []

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)

    if (entry.isDirectory()) {
      contents.push(await readStyleSources(entryUrl))
    } else if (entry.name.endsWith('.vue') || entry.name.endsWith('.css')) {
      contents.push(await readFile(entryUrl, 'utf8'))
    }
  }

  return contents.join('\n')
}

function resolveColor(name: string, variables: ReadonlyMap<string, string>): Rgb {
  let value = variables.get(name)

  const visited = new Set<string>()

  while (value?.startsWith('var(')) {
    if (visited.has(value)) {
      throw new Error(`Circular CSS variable reference from ${name}`)
    }

    visited.add(value)
    value = variables.get(value.slice(4, -1))
  }

  if (value === undefined) {
    throw new Error(`Missing CSS color ${name}`)
  }

  const hsl = /^hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)$/.exec(value)

  if (hsl === null) {
    throw new Error(`Unsupported CSS color for ${name}: ${value}`)
  }

  return hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]))
}

function hslToRgb(hue: number, saturationPercent: number, lightnessPercent: number): Rgb {
  const saturation = saturationPercent / 100

  const lightness = lightnessPercent / 100

  const chroma = saturation * Math.min(lightness, 1 - lightness)

  const channel = (offset: number): number => {
    const position = (offset + hue / 30) % 12

    return lightness - chroma * Math.max(-1, Math.min(position - 3, 9 - position, 1))
  }

  return [channel(0), channel(8), channel(4)]
}

function contrast(first: Rgb, second: Rgb): number {
  const firstLuminance = luminance(first)

  const secondLuminance = luminance(second)

  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
  )
}

function luminance(color: Rgb): number {
  const [red, green, blue] = color.map(channel =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )

  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
}
