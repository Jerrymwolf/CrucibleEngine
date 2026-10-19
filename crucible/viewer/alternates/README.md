# Alternate viewer designs

Two replay viewers were built in parallel on 2026-10-18 against the same run-log contract. The one in `../template.html` was chosen for the published page: cleaner storm rendering, a parish detail panel, and no clipped tables at desktop width.

`plex/` is the other: Barlow Semi Condensed with IBM Plex Mono, a lat/long grid on the map, cut-road rendering for isolated parishes, phase bands and a landfall marker on the decision strip, and an evidence column in the values gap table. Build it the same way: `node plex/build.mjs <run.json> <out.html>`. Ideas worth porting into the main viewer are the decision-strip phase bands and the evidence column.
