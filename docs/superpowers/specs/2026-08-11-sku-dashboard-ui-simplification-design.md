# SKU Dashboard UI Simplification Design

## Scope

Refactor the business dashboard into a focused SKU operations workspace. The user-confirmed daily workflow is:

- Overview: KPI summary, GMV target progress, campaign conversion trend.
- Detail: personal and channel breakdown from the channel detail data source.
- Fee calculator: keep the current fee calculation formulas and scenario behavior.
- Data source: keep one commonly used channel detail data source, with upload replacement and a manual-entry fallback.

Remove the old broad navigation from the visible product surface: home, legacy personal overview, channel overall fluctuation, help center, and other low-frequency pages should not appear in the main navigation.

Do not change the existing metric formulas or data cleaning rules in this UI refactor.

## Information Architecture

The app has two primary workspace tabs:

- `总览`: default landing view. Shows the compact executive view for current filtered data.
- `明细`: detailed personal/channel breakdown view.

Secondary tools live in the collapsible sidebar:

- `总览`
- `明细`
- `费比测算`
- `数据源`

The brand label is `SKU 经营看板`.

## Visual Direction

Use the user's reference UI as the visual direction:

- full-page layout, not a framed or nested app preview.
- light gray canvas with white rounded surfaces.
- black active pill states.
- orange highlight for the most important metric.
- soft shadows and large rounded cards.
- simple line-drawn icons in the sidebar.
- restrained operational density, not a landing-page or marketing layout.

Avoid showing explanatory feature copy inside the product. Labels should name data and actions, not teach the UI.

## Drag Ordering

Workspace components support drag ordering wherever the user naturally expects to rearrange the view:

- overview metric cards can be reordered.
- overview modules such as GMV target progress and campaign conversion trend can be reordered.
- detail-page table/chart modules can be reordered.
- fee-calculator scenario cards can keep their existing editable behavior and should support ordering if the restyled UI represents them as cards.

Persist component order in local storage. Drag handles should be visually subtle and should not dominate the reference UI style. Do not add drag behavior to atomic controls such as individual filter dropdowns, icon buttons, or form fields.

## Sidebar

The sidebar uses horizontal collapse, matching the existing app behavior:

- collapsed width around 96px.
- expanded width around 266px.
- collapsed state shows only simple line icons with tooltips.
- expanded state uses the same sidebar, widened horizontally, and reveals text labels.
- no floating drawer or separate popover for navigation expansion.
- bottom control toggles collapsed/expanded state.

The top sidebar area contains the brand mark and, in expanded state, `SKU 经营看板`.

The day/night control is functional:

- `日览` and `夜览` are shown as simple sun/moon line icons.
- selection changes the app theme state.
- persist the chosen mode in local storage.

## Overview

The overview page shows:

- filters: `营期`, `归属人`, `渠道号`, `分类`.
- all filters are dropdown-style controls.
- remove the old `日期 D4-D10` filter from this view.

The metric strip is horizontal and contains four cards:

- `leads 数`
- `封板成交 GMV`
- `封板转化率`
- `封板费比`

Do not show helper text under the metric values.

The GMV progress module follows the reference spending-limit style:

- title: `封板 GMV 目标进度`
- one horizontal progress bar with orange completed fill and muted striped remainder.
- left value shows completed GMV.
- right value shows target GMV.
- target GMV is manually editable and persisted.
- no 0/100% tick marks, vertical target line, or separate statistic cards.

The campaign conversion trend module shows:

- title: `营期转化走势`
- right-side indicator only shows `转化率`.
- horizontal chart layout.
- only a conversion-rate line is shown.
- campaign labels are shortened from full campaign names, for example:
  - `钢琴951.2.HYQLS.0807` -> `951HYQ`
  - `钢琴950.1.LYLS.0805` -> `950LY`

## Detail

`明细` should preserve the existing `板块二：个人 / 渠道拆解` behavior and layout from the channel detail page because this is the user's most common workflow. Enter it through the simplified navigation, but keep the function positions and UI arrangement identical to the current block-two design:

- top filters use the same four fields: `营期`, `渠道归属人`, `渠道号`, `分类`.
- rename the section title to `个人 / 渠道拆解`; do not show `板块二：`.
- detail content keeps the two-tab switch: `渠道归属人` and `渠道号明细`.
- keep the existing `ConversionTableCard` table implementation rather than recreating a similar table.
- keep the D4-D10 GMV/conversion heatmap-style table exactly, including the grouped columns `基础信息`, `当期转化 D4～D7`, `追单转化 D8～D10`, and `封板结果`.
- keep the existing unified blue heatmap color scale for the table rather than mixing unrelated accent colors.
- keep the table controls for sorting, GMV/conversion view mode, and channel top-N where applicable.
- keep sorting controls in their existing position and preserve sorting options such as `leads数↓`, `当期转化率`, `追单转化率`, and `封板转化率`.
- keep the operation control styling exactly: `导出 CSV` button followed by the `GMV低` label, the blue gradient legend bar, and the `GMV高` label.
- remove temporary detail mock modules such as `渠道号 Top 变化` and `D4-D10 转化节奏`.

Formula and aggregation code stays unchanged.

Visible copy should emphasize the actual table/chart content rather than legacy block names.

## Fee Calculator

Keep the current fee calculator formulas and scenario editing behavior unchanged.

Restyle the page to match the new workspace shell. Avoid changing the calculation function or persisted scenario data shape unless required for compatibility.

## Data Source

Only one primary data source is visible: the channel operation detail data source.

Supported actions:

- upload/replace the current channel detail file.
- clear the current channel detail file.
- open a manual-entry fallback window.

Manual entry fields:

- campaign
- owner
- channel ID
- category
- leads
- cost
- D4-D10 GMV values

Manual entries should feed the same channel detail row shape as uploaded rows so existing formulas continue to apply.

Future daily scheduled import is out of this implementation scope. The UI may keep code boundaries compatible with adding it later, but should not add a visible automated-import workflow now.

## Data And Formula Boundaries

Keep these existing formula surfaces unchanged:

- channel detail normalization and filtering.
- `summarizeChannelDetailRows`.
- D4-D10 GMV aggregation.
- current/follow/closed GMV calculations.
- conversion, ROI, cost-rate, and R-value formulas.
- fee calculator scenario formulas.

UI may add derived presentation helpers, such as campaign-short-name formatting and target-progress percentage.

## Persistence

Persist:

- selected page/module.
- sidebar collapsed state.
- day/night theme.
- overview filters.
- GMV target value.
- current channel detail upload.
- manual fallback rows.
- fee calculator scenarios.

Use the existing local-storage helper style.

## Validation

Run:

- `npm run build`

Then start a local dev server and verify:

- default route opens the new overview.
- sidebar collapses and expands horizontally.
- day/night mode toggles visually and persists after refresh.
- filters render as dropdown-style controls.
- GMV target can be edited and persists.
- campaign trend uses shortened campaign labels.
- detail page still shows personal/channel breakdown data.
- fee calculator results match the pre-refactor formulas.
- existing uploaded channel detail data in local storage still loads.
