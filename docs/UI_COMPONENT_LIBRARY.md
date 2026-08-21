# FPL UI component library

The visual source of truth is the [FPL Intelligence Figma file](https://www.figma.com/design/pNAuqjaj307plPrvdAMi3E).

## Foundations

The `FPL UI /` variable collections define semantic colour roles, spacing, radii, typography and elevation. The matching CSS custom properties live in `apps/web/src/app/globals.css` and must be used instead of screen-local colour values.

## Code components

`apps/web/src/components/ui/fpl.tsx` provides the reusable screen primitives:

- `Card`, `Alert`, `Badge`, `Skeleton`, and `EmptyState` for content and state presentation;
- `Field`, `SelectField`, `TextArea`, and `Checkbox` for form controls;
- `Tabs`, `Tab`, `NavigationItem`, and `IconButton` for navigation and compact actions.

Use the existing `Button` component for actions. Components must retain visible focus styles and must not imply automated FPL actions.
