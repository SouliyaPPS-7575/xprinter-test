import React from 'react'
import { Outlet, Link, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
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
  ),
})

