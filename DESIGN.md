# SyncSpace Design System (design.md)

## Overview

Figma's marketing canvas is, at the system level, an editor-clean black-and-white frame. The chrome — top nav, body type, footer, primary CTA — is monochrome. Headlines are oversized `{typography.display-xl}` set in `figmaSans` with aggressive negative tracking, body copy hovers around weight 320–340 of the same variable family, and small mono `{typography.eyebrow}` and `{typography.caption}` labels (figmaMono, all-caps, positive tracking) act as section markers. Every CTA is a pill — `{rounded.pill}` — and the primary action across the entire site is the same black `{components.button-primary}` paired with the same white `{components.button-secondary}`.

What makes the design unique is what happens **between** those monochrome bookends: the page repeatedly drops into oversized pastel **color-block sections** — lime, lavender, cream, mint, pink, coral, and a deep navy — that span the full content width with `{rounded.lg}` corners and `{spacing.xxl}` interior padding. These blocks are where the storytelling lives. They aren't accents tucked into a card; they take over a whole viewport's worth of vertical space, like a designer arranging giant sticky notes on a clean wall. FigJam is the most pastel-saturated, the home page rotates through the full set, and the pricing page ends with a lime FAQ panel — same vocabulary, different rhythm per route.

This is a system built on contrast: the monochrome chrome makes the color blocks feel intentional rather than decorative, and the color blocks make the monochrome chrome feel like editorial paper rather than enterprise SaaS. Density is generous, line-heights are tight on display sizes, and the interface never reaches for shadows or gradients to do the work that color blocks and confident typography already do.

**Key Characteristics:**
- Monochrome system core: `{colors.primary}` (black) and `{colors.canvas}` (white) carry every CTA, every body line, every footer link.
- Oversized pastel **color-block sections** (`{colors.block-lime}`, `{colors.block-lilac}`, `{colors.block-cream}`, `{colors.block-mint}`, `{colors.block-pink}`, `{colors.block-coral}`, `{colors.block-navy}`) define the narrative rhythm of every long-form page.
- Pill is the only button shape — `{rounded.pill}` for text CTAs, `{rounded.full}` for icon buttons. No square buttons anywhere.
- `figmaSans` variable typeface (fallback `Inter`) used at fine weight increments (320, 330, 340, 450, 480, 540) — the type system reads as a single voice that flexes rather than a multi-weight family.
- Tight negative letter-spacing on display sizes (-1.72px at 86px, -0.96px at 64px) creates a confident editorial cadence.
- `figmaMono` (fallback `JetBrains Mono`) reserved for category labels, eyebrows, and captions — always uppercase, positive tracking — to flag taxonomy without competing with display type.
- Color-block page rhythm: monochrome chrome → pastel color-block sections with generous whitespace.

## Colors

### Brand & Accent
- **Black** (`#000000` / `#0a0a0a`): The system primary. Every primary CTA, every headline, every body line.
- **White** (`#ffffff`): Inverse text on black surfaces; foreground of secondary pill buttons.
- **Magenta Promo** (`#ff2e93`): Single saturated CTA pink reserved for promotional inline moments.

### Surface
- **Canvas** (`#ffffff`): Default page background.
- **Inverse Canvas** (`#000000`): Dark sections and marquee strips.
- **Surface Soft** (`#f7f7f7` / `#f3f4f6`): Off-white tile background for template cards and tool panels.
- **Hairline** (`#e5e7eb` / `#e2e8f0`): 1px borders on form inputs, cards, and dividers.
- **Hairline Soft** (`#f3f4f6`): Subtle separators.
- **Block Lime** (`#d4f268`): The signature systems / FAQ / room creation color block.
- **Block Lilac** (`#e4d4f8`): Hero block on /design/; room joining block.
- **Block Cream** (`#fff5ea`): Soft warm background — FigJam hero strip, workspace hero.
- **Block Mint** (`#c7f5db`): Collaborative presence and live sync block.
- **Block Pink** (`#ffd6ea`): Interactive canvas block.
- **Block Coral** (`#ffc4b2`): "Ship products" story block.
- **Block Navy** (`#1e1e38`): Deep indigo editor block.

### Text
- **Ink** (`#000000`): All headline, body, and caption type on light surfaces.
- **Inverse Ink** (`#ffffff`): Type on inverse-canvas surfaces.

## Typography Tokens
- **Display-XL**: 64px - 72px, weight 340, letter-spacing -1.72px, line-height 1.05.
- **Display-LG**: 44px - 48px, weight 340, letter-spacing -0.96px, line-height 1.10.
- **Headline**: 24px - 26px, weight 540, letter-spacing -0.26px.
- **Subhead**: 20px - 24px, weight 340, letter-spacing -0.26px.
- **Body**: 16px - 18px, weight 320 - 340, line-height 1.45.
- **Button**: 15px - 16px, weight 500, letter-spacing -0.10px.
- **Eyebrow**: 12px - 14px, weight 500, JetBrains Mono, uppercase, letter-spacing 0.08em.
- **Caption**: 11px - 12px, weight 400, JetBrains Mono, uppercase, letter-spacing 0.06em.

## Buttons
- **`button-primary`**: Background Black (`#000000`), Text White (`#ffffff`), rounded `{rounded.pill}` (50px / 9999px), padding 12px 24px.
- **`button-secondary`**: Background White (`#ffffff`), Text Black (`#000000`), border `1px solid #e5e7eb`, rounded `{rounded.pill}`, padding 12px 24px.
