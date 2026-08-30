import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import type { AppConfig } from '../../config.ts'
import type { AppLogger } from '../../shared/logging/app-logger.ts'

export function createHttpApp(config: AppConfig, logger: AppLogger) {
  const app = new Hono()

  const webSocketOrigin = new URL(config.webSocketUrl).origin

  app.use('*', secureHeaders({
    contentSecurityPolicy: {
      baseUri: ['\'none\''],
      connectSrc: ['\'self\'', webSocketOrigin],
      defaultSrc: ['\'self\''],
      fontSrc: ['\'self\''],
      formAction: ['\'self\''],
      frameAncestors: ['\'none\''],
      imgSrc: ['\'self\'', 'data:'],
      mediaSrc: ['\'self\'', 'blob:'],
      objectSrc: ['\'none\''],
      scriptSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      workerSrc: ['\'self\'', 'blob:'],
    },
    permissionsPolicy: {
      autoplay: ['self'],
      camera: false,
      clipboardWrite: ['self'],
      displayCapture: ['self'],
      fullscreen: ['self'],
      geolocation: false,
      microphone: ['self'],
    },
    xFrameOptions: 'DENY',
  }))

  app.use('*', async (context, next) => {
    const requestId = crypto.randomUUID()

    const startedAt = performance.now()

    context.header('X-Request-Id', requestId)
    await next()

    const bindings = {
      durationMs: Math.round(performance.now() - startedAt),
      method: context.req.method,
      path: context.req.path,
      requestId,
      status: context.res.status,
    }

    if (context.req.path === '/health') {
      logger.debug(bindings, 'HTTP request completed')
    } else if (context.res.status >= 500) {
      logger.error(bindings, 'HTTP request completed')
    } else if (context.res.status >= 400) {
      logger.warn(bindings, 'HTTP request completed')
    } else {
      logger.info(bindings, 'HTTP request completed')
    }
  })

  app.onError((error, context) => {
    logger.error({
      err: error,
      method: context.req.method,
      path: context.req.path,
    }, 'Unhandled HTTP request error')

    return context.json({ error: 'Internal Server Error' }, 500)
  })

  app.get('/health', context => context.json({ status: 'ok' as const }))

  app.get('/api/config', (context) => {
    context.header('Cache-Control', 'no-store')

    return context.json({
      webSocketUrl: config.webSocketUrl,
      iceServers: config.rtcIceServers,
    })
  })

  return app
}
