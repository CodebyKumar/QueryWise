# Design System Documentation
## Modular RAG Application - Claude-Inspired Design

---

## Design Philosophy

Our design system draws inspiration from Claude AI's elegant, minimalist interface with a focus on:
- **Clarity**: Clean typography and generous whitespace
- **Warmth**: Soft, approachable color palette
- **Intelligence**: Sophisticated yet accessible design
- **Functionality**: Form follows function with purposeful interactions

---

## Color Palette

### Primary Colors (Claude-Inspired)

#### Warm Neutrals
```css
--color-bg-primary: #FFFFFF        /* Pure white background */
--color-bg-secondary: #F7F7F5      /* Warm off-white */
--color-bg-tertiary: #EFEDE8       /* Soft beige */
--color-bg-hover: #E8E6E0          /* Subtle hover state */
```

#### Accent Colors
```css
--color-accent-primary: #D97757     /* Warm terracotta */
--color-accent-hover: #C96847       /* Darker terracotta */
--color-accent-light: #F4E8E3       /* Light peachy background */
--color-accent-border: #E8C4B8      /* Soft border accent */
```

#### Text Colors
```css
--color-text-primary: #1A1A1A       /* Near black */
--color-text-secondary: #5C5C5C     /* Medium gray */
--color-text-tertiary: #8E8E8E      /* Light gray */
--color-text-inverse: #FFFFFF       /* White text */
--color-text-accent: #D97757        /* Accent text */
```

#### Semantic Colors
```css
--color-success: #2D7A4F           /* Forest green */
--color-success-light: #E8F5EE     /* Light green bg */
--color-error: #C94A3F             /* Warm red */
--color-error-light: #FCEAE8       /* Light red bg */
--color-warning: #E8A838           /* Warm amber */
--color-warning-light: #FDF6E8     /* Light amber bg */
--color-info: #4A7BA7              /* Soft blue */
--color-info-light: #E8F1F8        /* Light blue bg */
```

#### Border & Divider Colors
```css
--color-border-light: #E8E6E0      /* Subtle borders */
--color-border-medium: #D4D2CC     /* Medium borders */
--color-border-dark: #B8B6B0       /* Strong borders */
--color-divider: #EFEDE8           /* Section dividers */
```

---

## Typography

### Font Families

#### Primary Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Helvetica Neue', Arial, sans-serif;
```

#### Monospace Font Stack (for code)
```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 
             'Courier New', monospace;
```

### Font Sizes & Weights

```css
/* Display */
--text-display: 2.5rem (40px)      /* font-weight: 600 */
--text-display-line: 1.2

/* Headings */
--text-h1: 2rem (32px)             /* font-weight: 600 */
--text-h2: 1.5rem (24px)           /* font-weight: 600 */
--text-h3: 1.25rem (20px)          /* font-weight: 600 */
--text-h4: 1.125rem (18px)         /* font-weight: 600 */

/* Body */
--text-base: 1rem (16px)           /* font-weight: 400 */
--text-base-line: 1.6
--text-lg: 1.125rem (18px)         /* font-weight: 400 */
--text-sm: 0.875rem (14px)         /* font-weight: 400 */
--text-xs: 0.75rem (12px)          /* font-weight: 400 */

/* Weights */
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

---

## Spacing System

### Base Unit: 4px

```css
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-10: 2.5rem (40px)
--space-12: 3rem (48px)
--space-16: 4rem (64px)
--space-20: 5rem (80px)
--space-24: 6rem (96px)
```

### Layout Spacing
```css
--container-padding: 1.5rem (24px)
--section-gap: 3rem (48px)
--card-padding: 1.5rem (24px)
--input-padding: 0.75rem 1rem (12px 16px)
```

---

## Border Radius

```css
--radius-sm: 0.375rem (6px)        /* Small elements */
--radius-md: 0.5rem (8px)          /* Buttons, inputs */
--radius-lg: 0.75rem (12px)        /* Cards */
--radius-xl: 1rem (16px)           /* Large cards */
--radius-2xl: 1.5rem (24px)        /* Hero sections */
--radius-full: 9999px              /* Pills, avatars */
```

---

## Shadows

### Elevation System

```css
/* Subtle */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);

/* Default */
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08),
             0 1px 3px rgba(0, 0, 0, 0.06);

/* Elevated */
--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.1),
             0 2px 6px rgba(0, 0, 0, 0.08);

/* Floating */
--shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.12),
             0 4px 12px rgba(0, 0, 0, 0.1);

/* Focus Ring */
--shadow-focus: 0 0 0 3px rgba(217, 119, 87, 0.2);
```

---

## Component Specifications

### Buttons

#### Primary Button
```css
background: var(--color-accent-primary)
color: var(--color-text-inverse)
padding: 0.75rem 1.5rem
border-radius: var(--radius-md)
font-weight: var(--font-medium)
transition: all 0.2s ease

hover:
  background: var(--color-accent-hover)
  transform: translateY(-1px)
  shadow: var(--shadow-md)

active:
  transform: translateY(0)
```

#### Secondary Button
```css
background: transparent
color: var(--color-text-primary)
border: 1px solid var(--color-border-medium)
padding: 0.75rem 1.5rem
border-radius: var(--radius-md)

hover:
  background: var(--color-bg-hover)
  border-color: var(--color-border-dark)
```

#### Ghost Button
```css
background: transparent
color: var(--color-text-secondary)
padding: 0.75rem 1.5rem

hover:
  background: var(--color-bg-hover)
  color: var(--color-text-primary)
```

### Input Fields

```css
background: var(--color-bg-primary)
border: 1px solid var(--color-border-light)
border-radius: var(--radius-md)
padding: 0.75rem 1rem
font-size: var(--text-base)
color: var(--color-text-primary)
transition: all 0.2s ease

focus:
  border-color: var(--color-accent-primary)
  box-shadow: var(--shadow-focus)
  outline: none

placeholder:
  color: var(--color-text-tertiary)
```

### Cards

```css
background: var(--color-bg-primary)
border: 1px solid var(--color-border-light)
border-radius: var(--radius-lg)
padding: 1.5rem
box-shadow: var(--shadow-sm)
transition: all 0.2s ease

hover:
  box-shadow: var(--shadow-md)
  border-color: var(--color-border-medium)
```

### Chat Messages

#### User Message
```css
background: var(--color-bg-secondary)
border-radius: var(--radius-lg)
padding: 1rem 1.25rem
margin-left: auto
max-width: 80%
```

#### AI Response
```css
background: var(--color-bg-primary)
border: 1px solid var(--color-border-light)
border-radius: var(--radius-lg)
padding: 1.5rem
max-width: 100%
```

### Navigation

```css
background: var(--color-bg-primary)
border-bottom: 1px solid var(--color-border-light)
padding: 1rem 1.5rem
backdrop-filter: blur(8px)
position: sticky
top: 0
z-index: 50
```

---

## Animation & Transitions

### Timing Functions
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

### Duration
```css
--duration-fast: 150ms
--duration-base: 200ms
--duration-slow: 300ms
--duration-slower: 500ms
```

### Common Transitions
```css
/* Fade In */
opacity: 0 → 1
duration: var(--duration-base)

/* Slide Up */
transform: translateY(10px) → translateY(0)
opacity: 0 → 1
duration: var(--duration-slow)

/* Scale */
transform: scale(0.95) → scale(1)
duration: var(--duration-fast)
```

---

## Layout Patterns

### Container Widths
```css
--container-sm: 640px
--container-md: 768px
--container-lg: 1024px
--container-xl: 1280px
--container-2xl: 1536px
```

### Grid System
```css
/* 12-column grid */
display: grid
grid-template-columns: repeat(12, 1fr)
gap: var(--space-6)
```

### Responsive Breakpoints
```css
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
--breakpoint-2xl: 1536px
```

---

## Iconography

### Icon Sizes
```css
--icon-xs: 12px
--icon-sm: 16px
--icon-md: 20px
--icon-lg: 24px
--icon-xl: 32px
--icon-2xl: 48px
```

### Icon Style
- Use outline style for most icons
- Solid style for active/selected states
- Consistent stroke width: 1.5px
- Rounded line caps and joins

---

## Accessibility

### Focus States
- Visible focus ring on all interactive elements
- 3px offset with accent color at 20% opacity
- Never remove focus indicators

### Color Contrast
- Text on background: minimum 4.5:1 ratio
- Large text (18px+): minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio

### Touch Targets
- Minimum size: 44x44px
- Adequate spacing between interactive elements
- Larger targets on mobile devices

---

## Dark Mode (Future Enhancement)

### Dark Palette
```css
--color-bg-primary-dark: #1A1A1A
--color-bg-secondary-dark: #242424
--color-bg-tertiary-dark: #2E2E2E
--color-text-primary-dark: #E8E6E0
--color-text-secondary-dark: #B8B6B0
--color-accent-primary-dark: #E89B7D
```

---

## Usage Guidelines

### Do's
✓ Use consistent spacing from the spacing system
✓ Maintain hierarchy with typography scale
✓ Apply shadows sparingly for depth
✓ Use accent color for primary actions only
✓ Keep animations subtle and purposeful

### Don'ts
✗ Don't use arbitrary spacing values
✗ Don't mix multiple accent colors
✗ Don't overuse shadows or animations
✗ Don't compromise accessibility for aesthetics
✗ Don't use pure black (#000000)

---

## Implementation with Tailwind CSS

### Tailwind Config Extension
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#D97757',
        secondary: '#F7F7F5',
        accent: '#D97757',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'lg': '0.75rem',
        'xl': '1rem',
      },
    },
  },
}
```

---

**Design System Version:** 1.0.0  
**Last Updated:** November 7, 2025  
**Maintained By:** Design Team
