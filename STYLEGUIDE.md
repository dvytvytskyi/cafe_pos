# Corgi POS Style Guide

This document serves as the single source of truth for the Corgi POS design system. When building new features or refactoring old ones, always refer to these guidelines and use the atomic components from `src/components/ui/` rather than writing raw Tailwind classes.

## 1. Colors

**Primary Colors**
- **Corgi Yellow (`corgi` / `#FDBD38`)**: The primary brand accent. Use for active states, selected borders, focus rings (`focus:border-corgi`), primary toggle switches, and primary accents.
- **Black (`bg-black text-white`)**: The primary actionable color for core actions (e.g., Save Button).

**Backgrounds**
- **Main App Background (`bg-[#FAF7F3]`)**: The global app background.
- **Card/Modal Background (`bg-white`)**: Content containers.
- **Secondary Background (`bg-gray-50`)**: Used for footers, inactive location boxes, or secondary sections to provide subtle contrast.
- **Hover States (`hover:bg-gray-100`, `hover:bg-gray-50`)**: Subtle hover feedback on interactive elements.

**Text Colors**
- **Primary Text (`text-gray-900`)**: Standard text, labels, headers.
- **Secondary Text (`text-gray-500`)**: Subtitles, hints, placeholder text, inactive icons.
- **Accent Text (`text-corgi`)**: Used for highlighting (e.g., active languages `(EN)`).

## 2. Shapes & Radii

- **`rounded-xl` (approx. 12px-16px)**: The standard border radius for the vast majority of UI elements, including buttons, inputs, modals, and cards.
- **`rounded-full`**: Used strictly for perfectly circular elements, like avatars or the close (`X`) button in modals.
- **`rounded-lg` (approx. 8px)**: Used for small inner square icons (e.g., the 32x32px location icons).

## 3. Typography

- **Font**: `Nunito`
- **Labels**: `text-[14px] font-bold text-gray-900`
- **Hints/Subtitles**: `text-[11px] font-medium text-gray-400`
- **Buttons**: `text-[13px] font-bold`
- **STRICT RULE**: `font-extrabold` (font weight 800) is **STRICTLY BANNED** across the codebase. Maximum font weight permitted is `font-bold` (700) or `font-semibold` (600).

## 4. Interaction States

- **Active (Click) State**: Buttons must use `active:scale-95 transition-all` for a springy press effect.
- **Hover**: 
  - Primary buttons: `hover:bg-gray-800`
  - Secondary buttons: `hover:bg-gray-50` or `hover:bg-gray-200/50`
  - Inputs: `hover:border-gray-300`
- **Focus Rings**: Inputs should use `focus:border-corgi focus:ring-4 focus:ring-corgi/20`.

## 5. Components

Always prefer using the atomic components located in `src/components/ui/`:
- `<Button>`
- `<Input>`
- `<Label>`
- `<Modal>`

## 6. Table & List Animations

- **Sorting & Filtering**: Always use `framer-motion` for table rows or lists to maintain a fluid, modern feel.
- Use `<AnimatePresence>` (without `mode="popLayout"` for `<tr>` elements to avoid breaking the table layout) and wrap rows in `<motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>`.
- **Sortable Headers**: Use the `group` class on the `<th>`, and include an `ArrowUpDown` icon with `opacity-0 group-hover:opacity-100 transition-opacity` so it reveals on hover. When a column is actively sorted, show `ArrowUp` or `ArrowDown` with the `text-corgi` color.
