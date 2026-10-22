# Design Tokens

A technology-agnostic guide to structuring, naming, referencing and consuming design tokens.

## Terminology

| Term | Meaning |
|---|---|
| **Token** | A named value with a type. In DTCG, an object with `$value`. |
| **Group** | A named collection of tokens and groups. It has no `$value`. |
| **Path** | The group and token names that identify a token, joined by dots: `color.text.accent`. |
| **Alias** | A token whose value references another token. |
| **Modifier** | A dimension of variation, such as theme or density. |
| **Context** | One option of a modifier, such as `dark` or `compact`. |

## Layers

| Layer | Holds | Examples |
|---|---|---|
| **Base** (primitive) | The available values. Names describe the value. | `color.violet.700`, `space.200` |
| **Semantic** | Design decisions. Names describe purpose. | `color.text.accent`, `space.gap.small` |
| **Component** (optional) | Decisions specific to one component. | `tabs.size.indicator-thickness` |

- Consumers should use semantic tokens, and component tokens only within their own component.
- Prefer semantic tokens for values that vary by context. Contexts override semantic and component tokens, not base scales, so a base token will not follow the active context. Base tokens may be used directly for values intended to remain constant across contexts.
- Add a component token only when a semantic token cannot express the decision.

### Relationships

Each reference should add meaning or resolve a value:

| From | To | Use when |
|---|---|---|
| Semantic | Base | The usual case. |
| Semantic | Semantic | Two decisions are meant to change together, such as links following the accent color. |
| Semantic | Literal value | No scale applies, such as an opacity for disabled content. |
| Component | Semantic | The usual case. |
| Component | Base or literal value | The value has no meaning outside the component, such as a fixed width. |

- References should point toward lower layers or within the same layer. A base token that references a semantic token would make the scale depend on context.
- Do not alias one token to another only because their values match today. Their meanings may diverge.

```json
{
  "color": {
    "$type": "color",
    "violet": {
      "700": {
        "$value": { "colorSpace": "srgb", "components": [0.427, 0.157, 0.851], "hex": "#6d28d9" }
      }
    },
    "text": {
      "accent": { "$value": "{color.violet.700}" },
      "link": {
        "$value": "{color.text.accent}",
        "$description": "Follows the accent color."
      }
    }
  }
}
```

## Naming

### Requirements

The DTCG Format defines these rules:

- Token and group names must not contain `{`, `}` or `.`, and must not start with `$`.
- Names are case-sensitive.
- A path cannot be both a token and a group. A group's own value uses the reserved name `$root`: `color.border.$root`.

### Structure

Paths should read from broad to specific. This guide recommends the following order, with every segment after the category optional:

```text
{category}.{property}.{role}.{variant}.{state}
```

- **category**: the kind of value (`color`, `space`, `radius`).
- **property**: what the value applies to (`background`, `text`, `gap`).
- **role**: the purpose (`accent`, `surface`, `error`, `overlay`).
- **variant**: an emphasis (`subtle`, `bold`) or a scale step (`small`, `large`).
- **state**: an interaction or selection state. See [States](#states).

Other orders work if applied consistently.

Component tokens follow the same structure, prefixed with the component name: `tabs.size.indicator-thickness`.

| Category | Base | Semantic |
|---|---|---|
| `color` | `color.violet.700` | `color.background.accent.subtle.hover` |
| `space` | `space.200` | `space.gap.small`, `space.padding.medium` |
| `size` | `size.400` | `size.icon.medium` |
| `radius` | `radius.200` | `radius.control`, `radius.overlay` |
| `border` | `border.width.100` | `border.width.focus` |
| `shadow` | `shadow.200` | `shadow.overlay` |
| `font` | `font.weight.600` | `font.body.medium` |
| `motion` | `motion.duration.150` | `motion.duration.short`, `motion.easing.enter` |
| `opacity` | `opacity.400` | `opacity.disabled` |

### Recommendations

- Semantic names should describe purpose and survive a visual redesign: not `purple-button`. Base names describe the value.
- Base scales should use numeric steps with gaps (`100`, `200`), leaving room for intermediate values. Semantic scales should use ordered words (`small`, `medium`, `large`).
- Write names in lowercase. Use kebab-case within a segment: `on-accent`.
- Either omit the resting state (`color.border`, `color.border.focus`) or name it explicitly (`color.border.default`). Naming it makes the resting state explicit. Choose one and apply it everywhere.
- Avoid ambiguous abbreviations. If the system uses abbreviations, define them in its vocabulary.
- Do not name tokens after pages, features or one-off business context: `checkout.color.background`, `home-card-special`. Component names are the exception, because a component is a reusable part of the system rather than a product feature.
- Keep the vocabulary defined and shared. Add a term when a token needs it.

### Platform names

Each platform derives names from the path with one documented, deterministic transformation:

| Platform | `color.text.accent` becomes |
|---|---|
| CSS custom property | `--color-text-accent` |
| JavaScript | `tokens.color.text.accent` |
| Android resource | `color_text_accent` |

- Platform names omit `$root`: `color.border.$root` becomes `--color-border`.
- A joined name cannot always be split back into a path: in `--color-text-on-accent`, the hyphen in `on-accent` is indistinguishable from a path separator. Treat the token source as authoritative.

## References

References allow tokens to reuse values without duplication, keeping related design decisions consistent.

The DTCG format supports two reference syntaxes:

| Syntax | Example | Targets |
|---|---|---|
| Curly brace | `"{color.violet.700}"` | A complete token. Resolves to its `$value`. |
| JSON Pointer | `{ "$ref": "#/color/violet/700/$value/components/0" }` | Any location, including part of a value. |

### Requirements

The DTCG Format defines these rules:

- A curly brace reference must target a complete token, not a group or part of a value. To reference a group's own value, target its `$root` token.
- Inside a composite token, such as a shadow, a sub-value may be a reference to a token of that sub-value's type.
- References may chain. Tools must follow each one until they reach an explicit value.
- References and group extensions must not form cycles. Tools must report a cycle as an error.
- Tools must not infer a type from a value, and must report type mismatches.

### Recommendations

- Prefer curly brace references, which the format marks as the [recommended syntax](https://www.designtokens.org/tr/2025.10/format/#x6-6-1-current-reference-syntax-recommended). Support for JSON Pointer is inconsistent within the format: [References and JSON Pointer integration](https://www.designtokens.org/tr/2025.10/format/#x6-6-references-and-json-pointer-integration) says tools *may* support it, while [JSON Pointer syntax](https://www.designtokens.org/tr/2025.10/format/#x7-1-2-json-pointer-syntax-required-support) says they *must*. Use JSON Pointer only to reference part of a value.
- Declare `$type` explicitly on an alias whose type could be resolved in more than one way. The format is ambiguous here: [Type](https://www.designtokens.org/tr/2025.10/format/#x5-2-2-type) resolves an untyped alias to the type of the token it references before its parent group's type, while [Type inheritance](https://www.designtokens.org/tr/2025.10/format/#x6-7-3-type-inheritance) lists only explicit and group types.

### Group inheritance

In the DTCG Format, a group can extend another group with `$extends`:

- The target must be a group, not a token.
- Content merges deeply. A local token at the same path replaces the inherited token entirely, not property by property.
- A group's `$type` and `$deprecated` apply to its descendants unless they override them.

Use `$extends` for variants that share most of their tokens, such as component variants. Model themes and other contexts with modifiers instead (see [Contexts](#contexts)).

## States

Encode a state only when it changes the value.

| State | Applies when |
|---|---|
| `hover` | A pointer rests on the element. |
| `pressed` | The element is being activated. |
| `focus` | The focus indicator is visible, typically after keyboard navigation. |
| `selected` | The element is chosen within a set. |
| `disabled` | The element cannot be interacted with. |

These names are a recommended vocabulary. Whatever the names, keep them consistent across categories.

- Map each state to the platform's own signal: a pseudo-class, an attribute or a native control state.
- Keep focus and selection distinct. In a list, one item can be focused while another is selected, and users need to tell them apart.
- When states combine, fix their order: `color.background.selected.hover`.
- Treat validation and status, such as `error` or `success`, as roles rather than states. They persist across interaction and combine with states: `color.border.error.hover`.
- Do not reuse one state's token for another. Add the missing state, such as `open`, instead.

## Contexts

A context changes values without changing token names. The DTCG Resolver models each dimension as a modifier with named contexts, and merges token sets and modifiers in a declared `resolutionOrder`.

| Modifier | Example contexts |
|---|---|
| `theme` | `light`, `dark` |
| `contrast` | `standard`, `high` |
| `density` | `comfortable`, `compact` |
| `motion` | `standard`, `reduced` |

- Declare which modifiers the system supports and the default context of each. In the Resolver, a modifier's `default` must name one of its contexts.
- Define every token in the default context first. Override only the tokens whose values differ.
- Do not encode context in token names. Use `color.background.surface` instead of `color.background.surface-dark`.
- Consumers should not branch on context. The token values change, so consumer code does not have to.

### Combining modifiers

Several modifiers can be active at once, such as a dark theme with high contrast.

- Later entries in `resolutionOrder` override earlier ones: when two modifiers set the same token, the later one wins. Order modifiers so that refinements come last, such as contrast after theme.
- Prefer orthogonal modifiers, which affect disjoint tokens. Overlap should be deliberate.
- Aliases resolve after all overrides are applied, so a later modifier can reference tokens that an earlier one sets.
- If a value depends on two modifiers at once, consider merging them into one modifier with combined contexts.
- Platforms that apply overrides by cascade, such as CSS, should reproduce the declared order.
- Validate every supported combination: references resolve, types match and contrast requirements pass. Document unsupported combinations.

### Platform modes

- Platform-enforced color modes, such as forced colors, replace authored colors. Use the platform's system colors in those modes rather than tokens.
- Reduced motion can be a context of motion tokens. Without motion tokens, consumers handle it directly.

## Accessibility

Contrast is a property of a pair of colors, not of a single token.

### Requirements

WCAG 2.2 level AA defines these requirements:

- Text must reach 4.5:1 against its background. Large text, at least 18pt or 14pt bold, must reach 3:1.
- Visual information needed to identify a control or its state must reach 3:1 against adjacent colors. This includes focus indicators and graphics needed to understand content.
- A border must reach 3:1 only when it is what identifies the control. Decorative dividers have no minimum.
- Disabled components, purely decorative text and logotypes are exempt. Placeholder and read-only text are not.
- Focus must be visible. Focus Appearance is level AAA, so it is not required at AA.

### Recommendations

- Make each intended pair clear from the token names, such as `color.text.on-accent` on `color.background.accent`, or from `$description`.
- Recheck affected pairs in every supported context combination whenever a value changes, since each context produces different pairs.

## Consumption

Consumers reference tokens through their platform names:

```css
.card {
  background: var(--color-background-surface);
  color: var(--color-text-primary);
  border-radius: var(--radius-overlay);
}
```

- Choose tokens by meaning, not by matching values.
- Declare which categories the system tokenizes. Within those categories, consumers should use tokens for every value.
- In categories that are not tokenized yet, raw values are acceptable. When the same value with the same meaning repeats across components, propose a token.

Some values need no token, even in tokenized categories:

- Platform keywords such as `transparent`, `currentColor` and `inherit`, or their equivalents.
- System colors in platform-enforced color modes.
- Values that are private to one component or provided at runtime by a library, and are not part of the public API.

## Evolution

When adding or changing tokens:

1. Reuse a semantic token when its meaning matches.
2. Otherwise, add a token together with its first consumer, so the token set grows from real needs.
3. Add a `$description` when a token's use is not obvious from its name.
4. Before removing or renaming a token that consumers outside your control depend on, deprecate it:
   - Mark it with `$deprecated`, using a string that names the replacement.
   - Keep it as an alias of its replacement until consumers migrate.
   - Plan a migration window. As a reference, Spectrum's draft specification keeps deprecated tokens for at least two minor versions.

## Checklist

Use this list when reviewing a new or changed token:

- [ ] No existing semantic token covers this meaning.
- [ ] The token belongs to the right layer: semantic for values that vary by context, component only when no semantic token fits.
- [ ] The name follows the system's structure and vocabulary, describes purpose, and contains no page, feature or context.
- [ ] References point to a lower layer or within the same one, add meaning, resolve to the expected type and form no cycle.
- [ ] States are encoded only when they change the value, and contexts are handled by modifiers.
- [ ] Contrast pairs pass in every supported context combination.
- [ ] At least one consumer uses the token.
- [ ] A renamed or removed token that external consumers depend on is deprecated first.

## Sources

- DTCG 2025.10: [Format](https://www.designtokens.org/tr/2025.10/format/), [Resolver](https://www.designtokens.org/tr/2025.10/resolver/), [Color](https://www.designtokens.org/tr/2025.10/color/)
- Adobe Spectrum: [Design tokens](https://spectrum.adobe.com/page/design-tokens/), [Design Data Specification](https://opensource.adobe.com/spectrum-design-data/spec/)
- W3C: [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
