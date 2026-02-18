import Heading from '@tiptap/extension-heading'

export const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      starred: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-starred') === 'true',
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.starred) return {}
          return { 'data-starred': 'true' }
        },
      },
    }
  },
})
