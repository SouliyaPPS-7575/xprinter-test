import React from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import './styles.css'

const root = document.getElementById('root')!
const router = createRouter({ routeTree })
const queryClient = new QueryClient()
createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
