# 3D portfolio build snapshot

This preserves the inputs needed to rebuild the currently published Renaissance performance page. The old Astro site at repository root is separate and is not the source of the current 3D page. Never publish the root Astro build over `gh-pages`.

Use Node 22.12 or later. From this directory:

```sh
npm ci --prefix work/real-3d-atelier
node work/renaissance-performance/build.mjs
node --test work/renaissance-performance/project-flight.test.mjs work/renaissance-performance/performance.test.mjs work/renaissance-performance/startup.test.mjs work/renaissance-performance/preload.test.mjs
```

The generated page and content-hashed assets appear in `outputs/ryan-renaissance-performance/`. This build does not deploy. Production currently lives on the separate `gh-pages` branch; update only the intended files through a reviewed change and verify the result before deployment. Do not run the old root `scripts/deploy.sh`.

## What is preserved

- Unminified performance runtime, startup, scroll, card animation, tests and build code.
- Site identity, locale, common interactions, selected portrait, source night textures, and exact mobile/desktop GLB inputs.
- A frozen baseline HTML/project snapshot, reference still, camera geometry, and attribution files used as input by the performance builder.
- Dependency lockfile and package manifest.

The baseline HTML and GLB are generated upstream artifacts, not a complete Blender authoring project or a fully editable reconstruction of the original page. They are kept as frozen inputs so this performance build can be reconstructed; rebuilding the underlying 3D model from authoring files requires additional local source and is not claimed here.
