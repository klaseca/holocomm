import { serveStatic } from '@hono/node-server/serve-static'
import type { Hono } from 'hono'

const RESERVED_PATH_PREFIXES = ['/api', '/health', '/ws']

export function registerStaticFiles(app: Hono, root: string): void {
  app.use('*', serveStatic({ root }))

  const serveIndex = serveStatic({ root, path: 'index.html' })

  app.get('*', async (context, next) => {
    const acceptsHtml = context.req.header('accept')?.includes('text/html') ?? false

    const reserved = RESERVED_PATH_PREFIXES.some(prefix => context.req.path.startsWith(prefix))

    if (!acceptsHtml || reserved) {
      return next()
    }

    return serveIndex(context, next)
  })
}
