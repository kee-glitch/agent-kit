import { describe, expect, it } from 'vitest'
import nodeStyles from '../features/nodes/nodes.css?raw'
import editorStyles from '../features/media-editor/media-editor.css?raw'
import shellStyles from './app.css?raw'

describe('canvas theme style boundaries', () => {
  it('keeps_feature_styles_semantic_so_both_themes_can_supply_values', () => {
    expect(nodeStyles).not.toMatch(/#[0-9a-f]{3,8}|rgb\(/i)
    expect(shellStyles).not.toMatch(/#[0-9a-f]{3,8}|rgb\(/i)
  })

  it('keeps_the_media_editor_reachable_at_phone_widths', () => {
    expect(editorStyles).toContain('@media (max-width: 560px)')
    expect(editorStyles).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(editorStyles).toContain('overflow: auto')
    expect(editorStyles).toContain('left: 86px')
  })
})
