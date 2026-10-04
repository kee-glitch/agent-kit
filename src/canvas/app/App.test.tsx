import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CanvasApp } from './CanvasApp'

describe('App', () => {
  it('renders_the_workspace_root', () => {
    render(<CanvasApp theme="original" />)

    expect(
      screen.getByRole('main', { name: '无限画布工作台' }),
    ).toBeInTheDocument()
  })

  it('cleans_up_between_tests', () => {
    expect(
      screen.queryByRole('main', { name: '无限画布工作台' }),
    ).not.toBeInTheDocument()
  })
})
