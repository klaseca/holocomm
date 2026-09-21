import { readdir, readFile } from 'node:fs/promises'

import { describe, expect, test } from 'vitest'

describe('generated design tokens', () => {
  test('resolves token references separately in each theme', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    for (const [theme, themeCss] of themeStyles(css)) {
      const definitions = parseVariables(themeCss)

      expect(missingReferences(themeCss, definitions), theme).toEqual([])
    }
  })

  test('provides every design token referenced by frontend styles', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    const frontendStyles = await readStyleSources(
      new URL('../../apps/frontend/src/', import.meta.url),
    )

    for (const [theme, themeCss] of themeStyles(css)) {
      const definitions = new Map([
        ...parseVariables(themeCss),
        ...parseVariables(frontendStyles),
      ])

      expect(
        missingReferences(frontendStyles, definitions)
          .filter(name => !name.startsWith('--reka-')),
        theme,
      ).toEqual([])
    }
  })

  test('keeps stateful actions discernible and semantic text at AA contrast', async () => {
    const css = await readFile(new URL('./generated/tokens.css', import.meta.url), 'utf8')

    const pairs = [
      ['--button-primary-fg-color-rest', '--button-primary-bg-color-rest', 4.5],
      ['--button-primary-fg-color-rest', '--button-primary-bg-color-hover', 4.5],
      ['--button-primary-fg-color-rest', '--button-primary-bg-color-active', 4.5],
      ['--button-danger-fg-color-rest', '--button-danger-bg-color-rest', 4.5],
      ['--button-danger-fg-color-hover', '--button-danger-bg-color-hover', 4.5],
      ['--button-danger-fg-color-active', '--button-danger-bg-color-active', 4.5],
      ['--fg-color-accent', '--bg-color-default', 4.5],
      ['--fg-color-success', '--bg-color-default', 4.5],
      ['--fg-color-attention', '--bg-color-default', 4.5],
      ['--fg-color-danger', '--bg-color-default', 4.5],
      ['--tooltip-fg-color', '--tooltip-bg-color', 4.5],
      ['--focus-outline-color', '--bg-color-default', 3],
      ['--focus-outline-color', '--bg-color-muted', 3],
      ['--focus-outline-color', '--overlay-bg-color', 3],
      ['--focus-outline-color', '--control-bg-color-rest', 3],
    ] as const

    const violations: string[] = []

    for (const [theme, themeCss] of themeStyles(css)) {
      const variables = parseVariables(themeCss)

      for (const [foreground, background, minimum] of pairs) {
        const ratio = contrast(
          resolveColor(foreground, variables),
          resolveColor(background, variables),
        )

        if (ratio < minimum) {
          violations.push(`${theme}: ${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})

type Rgb = readonly [number, number, number]

function themeStyles(css: string): readonly [readonly [string, string], readonly [string, string]] {
  const [darkCss, lightCss] = css.split('[data-color-scheme=\'light\']')

  if (!darkCss?.includes('color-scheme: dark;') || !lightCss?.includes('color-scheme: light;')) {
    throw new Error('Expected generated CSS to contain dark and light themes')
  }

  return [['dark', darkCss], ['light', lightCss]]
}

function parseVariables(css: string): ReadonlyMap<string, string> {
  return new Map(
    [...css.matchAll(/^\s*(--[\w-]+):([^;\r\n]+);/gm)].map(
      match => [match[1]!, match[2]!.trim()] as const,
    ),
  )
}

function missingReferences(css: string, definitions: ReadonlyMap<string, string>): string[] {
  return [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(match => match[1]!))]
    .filter(name => !definitions.has(name))
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

  if (hsl !== null) {
    return hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]))
  }

  const rgb = /^rgb\(([\d.]+)% ([\d.]+)% ([\d.]+)%\)$/.exec(value)

  if (rgb !== null) {
    return [Number(rgb[1]) / 100, Number(rgb[2]) / 100, Number(rgb[3]) / 100]
  }

  throw new Error(`Unsupported CSS color for ${name}: ${value}`)
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
