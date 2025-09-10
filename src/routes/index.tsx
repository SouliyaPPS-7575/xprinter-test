import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Xprinter } from './xprinter'

export const Route = createFileRoute('/')({
  component: () => <Xprinter />,
})

