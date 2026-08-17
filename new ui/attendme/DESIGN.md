---
name: AttendMe
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#454651'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#767683'
  outline-variant: '#c6c5d3'
  surface-tint: '#4858ab'
  primary: '#4352a5'
  on-primary: '#ffffff'
  primary-container: '#5c6bc0'
  on-primary-container: '#f8f6ff'
  inverse-primary: '#bac3ff'
  secondary: '#126d27'
  on-secondary: '#ffffff'
  secondary-container: '#9cf49c'
  on-secondary-container: '#19722b'
  tertiary: '#ab2126'
  on-tertiary: '#ffffff'
  tertiary-container: '#ce3b3b'
  on-tertiary-container: '#fff5f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00105b'
  on-primary-fixed-variant: '#2f3f92'
  secondary-fixed: '#9ff79f'
  secondary-fixed-dim: '#83da85'
  on-secondary-fixed: '#002105'
  on-secondary-fixed-variant: '#005318'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#910816'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-metric:
    fontFamily: manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -1px
  headline-lg:
    fontFamily: manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

This design system is built upon the principles of Material 3 (Material You), focusing on a premium, minimal, and calm experience for student attendance tracking. The interface prioritizes effortless interaction, reducing the cognitive load of administrative tasks through generous whitespace and a "quiet" visual hierarchy.

The aesthetic blends **Modern Corporate** reliability with **Minimalist** clarity. It utilizes adaptive tonal surfaces rather than heavy lines to define structure, ensuring the focus remains entirely on student data and actionable metrics. The emotional response is one of organized tranquility—moving away from the "urgent" nature of traditional school software toward a sophisticated, supportive tool.

## Colors

The palette is rooted in soft, desaturated tones to maintain a calm environment. 

- **Primary (Soft Indigo):** Used for key actions, active states, and brand recognition. It suggests intelligence and focus.
- **Success (Calm Green):** Reserved for "attended" statuses and positive trends. It is high-visibility but low-vibrancy.
- **Error/Warning (Soft Coral):** Indicates absences or students at risk. The tone is informative rather than alarming.
- **Neutral/Surface:** In light mode, the system uses a very light gray (`#F8F9FA`) to reduce eye strain compared to pure white. In dark mode, a deep charcoal (`#121212`) provides the foundation, with surfaces using a slightly lighter elevation (`#1E1E1E`) to create depth without relying on pure black.

## Typography

The design system employs **Manrope** to capture the modern, refined, and balanced feel required for a premium tool. The hierarchy is strictly enforced:

1.  **Metrics:** Large, bold numerals (`display-metric`) are used for attendance percentages and total counts, serving as the primary anchor for dashboard views.
2.  **Headings:** Section headers use `headline-lg` with a semi-bold weight to provide clear structural signposts.
3.  **Body & Labels:** Supporting text uses `body-md`. For metadata or secondary details, `label-sm` is used with a slightly muted color (60% opacity) to create a clear visual distinction from primary content.

## Layout & Spacing

The layout follows a **Fluid Grid** system based on an 8px square rhythm. 

- **Desktop:** A 12-column grid with 24px gutters and 48px outer margins. Content is often contained within wide cards to maintain a tidy appearance.
- **Mobile:** A 4-column grid with 16px margins. 
- **Spacing Philosophy:** Use `lg` (40px) or `xl` (64px) spacing between major sections to emphasize the "minimal and calm" narrative. Components within cards should use `md` (24px) padding to ensure the UI feels airy and premium.

## Elevation & Depth

This design system utilizes **Tonal Layers** and **Ambient Shadows** to define hierarchy, moving away from high-contrast borders.

- **Level 0 (Background):** The base canvas (Light Gray or Deep Charcoal).
- **Level 1 (Surface/Cards):** Slightly elevated surfaces using a soft, diffused shadow (Blur: 16px, Y: 4px, Opacity: 4% in light, 12% in dark). In dark mode, this level is also distinguished by a subtle increase in lightness (tonal elevation).
- **Level 2 (Interaction):** Hover states or active dialogs increase shadow diffusion and slightly lighten the surface color to signify "closeness" to the user.

## Shapes

The shape language is defined by significant roundedness to evoke a friendly and approachable feel. 

- **Cards:** Use `rounded-xl` (1.5rem / 24px) to create a containerized, modern look.
- **Buttons:** All buttons must be **Pill-shaped** (fully rounded edges) to align with the Material 3 aesthetic.
- **Selection Controls:** Checkboxes and small inputs use `rounded-lg` (1rem / 16px) to maintain consistency with the overall "soft" visual language.

## Components

- **Buttons:** Utilize pill shapes. Primary buttons use the Soft Indigo background with white/high-contrast text. Secondary buttons use a tonal variant (Indigo at 10% opacity) with Indigo text.
- **Circular Progress Rings:** Used for student attendance percentages. Use a thick stroke (8px-12px) with rounded caps. The background track should be 10% opacity of the status color (Success or Error).
- **Attendance Cards:** Large `rounded-xl` containers. Include the student's name in `title-md`, their status in a colored `chip`, and a large `display-metric` for their individual rate.
- **Chips:** Small, pill-shaped indicators for "Present", "Absent", or "Excused". Use desaturated background tints of the status colors with darkened text for legibility.
- **Input Fields:** Filled style with bottom-only indicators or fully rounded containers with subtle borders. Backgrounds should be slightly darker than the surface they sit on.
- **Lists:** Use generous vertical padding (16px-24px) between list items. Use subtle dividers only if necessary; otherwise, let whitespace define the boundaries.