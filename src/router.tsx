import React from 'react'
import {
  Router,
  RouterProvider,
  Outlet,
  Link,
  createRootRoute,
  createRoute
} from '@tanstack/react-router'
import { Xprinter } from './routes/xprinter'

const RootComponent: React.FC = () => (
  <div className="app">
    <header>
      <nav>
        <Link to="/xprinter">Xprinter</Link>
      </nav>
    </header>
    <main>
      <Outlet />
    </main>
  </div>
)

const rootRoute = createRootRoute({
  component: RootComponent,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Xprinter,
})

const xprinterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'xprinter',
  component: Xprinter,
})

const routeTree = rootRoute.addChildren([indexRoute, xprinterRoute])

export const router = new Router({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
