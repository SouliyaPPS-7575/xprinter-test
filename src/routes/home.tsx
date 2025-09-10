import React from 'react'
import { Link } from '@tanstack/react-router'

export const Home: React.FC = () => {
  return (
    <div>
      <h1>Welcome</h1>
      <p>This is a Vite + React + TypeScript app using TanStack Router.</p>
      <p>
        Head over to the <Link to="/xprinter">Print</Link> page to test JSPrintManager.
      </p>
    </div>
  )
}

