import HardBreak from '@tiptap/extension-hard-break'

/**
 * Extends the default HardBreak node to support an optional `spacing` attribute.
 * This preserves LaTeX `\\[0.3cm]` line break spacing through the editor round-trip.
 */
export const HardBreakSpacing = HardBreak.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      spacing: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-spacing') || null,
        renderHTML: (attributes) => {
          if (!attributes.spacing) return {}
          return { 'data-spacing': attributes.spacing }
        },
      },
    }
  },
})
