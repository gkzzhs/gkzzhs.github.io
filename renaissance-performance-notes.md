# Renaissance preview: mobile performance pass

## Scope

Only `renaissance-preview.html` and its namespaced `assets/renaissance-perf/` dependencies change. The deployed original homepage, its `_astro` assets and the old preview resources remain untouched. The complete seated sculpture, pose, MacBook desktop image, copy, four project pages, white glove, languages, theme controls and free scrolling are retained.

The live HTML was checked against the local baseline by SHA-256: `dbb7ec2cbba8b81f7257aea29e186409846ccbea45a70978cc45db802b8393fa`. GitHub Pages currently serves the `gh-pages` branch.

## Resource sizes (uncompressed bytes)

| Resource | Before | After |
| --- | ---: | ---: |
| Main HTML | 4,587,261 | 184,616 |
| Scene runtime | 2,285,089 | 955,364 |
| Scene model on phones/tablets | 11,416,888 | 3,871,140 |
| Scene model on desktop | 11,416,888 | 5,949,676 |

HTML reduction: 96.0%. Mobile scene-model reduction: 66.1%. These are file sizes, not a measured download-time or FPS claim. Cacheable assets are no longer repeatedly embedded in HTML.

## Runtime changes

- Treat coarse-pointer/multi-touch devices as mobile, including wide iPads that report desktop user agents. Narrow viewports and low reported memory also select the mobile tier.
- Mobile: one direct render pass, baked lighting, no GTAO / half-float postprocessing targets / postprocessing 4x MSAA / realtime shadows. Keep native canvas edge antialiasing. Cap DPR at 1.2 and drawing area at 1.15 million pixels. Reduce resolution further after sustained slow frames.
- Desktop: use the 2048px texture model and a smaller, non-multisampled postprocessing pipeline; cap solar shadows at 2048 instead of 4096.
- Preserve thin floor seams and device-shell geometry. Reduce tessellation only on the two dominant meshes; retain the original model positions rather than quantizing them a second time.
- The first scene frame no longer waits for all optional night maps. Stable lighting no longer updates every material on every frame.
- Use hashed HTTP-cached GLBs rather than blocking IndexedDB reads and extra large model copies. Validate the streamed payload size.
- Overall startup watchdog: 90 seconds, in the background. The poster and the complete portfolio are usable immediately; the visitor is never held at a black loading gate. Runtime/model/WebGL failure leaves the readable page. Explicit fallback remains available with `?scene=poster`.
- Merge resize events, respect the CSS-owned stable scene size, skip equal-sized buffers, and avoid regenerating four project textures when only viewport height changes.
- Initialize the second WebGL context only near the Work section. Preserve the mobile curved-card animation. Stop main-scene rendering offscreen and stop card drawing when settled.
- Cache layout measurements for the tool marquee; avoid unchanged/offscreen chapter writes. Touch scrolling stays native and continuous.
- Namespace the four unchanged project detail pages with valid return links. Preserve the original workflow GIF bytes.

## Original performance-pass validation

The following browser checks were performed on the previously deployed performance pass, before the 2026-10-23 startup changes. They are not a new visual sign-off.

- 4 original Node regression tests passed: wide iPad tier selection, phone/memory pixel budget, truncated/corrupt/missing model handling, release size and dependency checks.
- Main-page text and all four project-page texts exactly match the baseline after parsing out scripts/styles.
- Original workflow GIF bytes preserved.
- Desktop browser checks: 390x844, 1024x768 using the mobile tier, and 1440x900 desktop tier; no horizontal overflow. Scene loads, anchors work, project details open, English and reduced-motion modes work, system theme is restored after testing.
- Observed mobile work-card idle counters stop, and the main scene stops rendering outside the scene track. Height-only resize retained one texture build.
- A local missing-model (HTTP 404) fixture exits the loading gate, shows the poster, restores hero opacity and reduces the scene track to one viewport; four project links remain available.

**Limit:** These checks used a desktop browser at device-sized viewports, plus explicit mobile-tier selection for the iPad-sized check. No physical iPhone/iPad, Safari memory-pressure test, or throttled cellular benchmark was available. Real-device validation is still required; no universal FPS claim is made.

## Startup refinement — 2026-10-23

The model files and image quality remain byte-for-byte unchanged from the deployed performance pass. The bottleneck addressed here is resource scheduling, transfer latency and the blocking loading experience.

- Start the model download from a small head script while preloading the scene runtime. Three.js no longer has to initialize before the model request starts.
- Check the same-origin HTTP cache without a network request first, preserving reuse of models cached by the previous release. A miss or unsupported cache-only mode falls through to the normal download. Hashed URLs use `force-cache`; `?cache` bypasses it for diagnosis.
- For the two known model hashes, use an immutable jsDelivr mirror of the already public `e355fe0481a5afca715541b32fb62f70e108102e` commit. Unknown future hashes are never assigned that mirror.
- If the mirror has not begun delivering after 1.5 seconds, or stops delivering for 2.5 seconds, start the same-origin fallback. A healthy streaming download does not start a duplicate transfer. Once a complete, validated result wins, abort the other request.
- Validate exact byte length and, when Web Crypto is available, the content hash. An error, truncated payload or wrong model cannot be passed to the scene parser.
- Show the existing studio poster and readable hero while resources load. The loading status is compact and the Work link remains usable.
- Keep the scene track at one viewport until 3D is ready. Only expand it while the visitor is at the top. If the visitor has already scrolled into the portfolio, keep the scene in standby until they return to the top. Explicit scene-review deep links reserve their original track length from the beginning.
- Warm shaders and the first two renders while the canvas is hidden. Optional night textures start afterward. Reduced-motion changes during loading cannot reveal an unready canvas.
- Measure startup from the early head request, including runtime transfer, model transfer, parse and GPU warmup. Timing values in `#scene` data attributes are diagnostic, not a claim about all devices.

### Checks for this revision

- 13 Node checks pass: quality tiers, resource budgets, payload validation, cache hit, cache-only compatibility fallback, CDN error/stall, avoiding duplicate healthy downloads, cancellation, loading-gate completion/standby, reduced motion and failure/watchdog behavior.
- Main-page visible copy and all four project detail HTML files are unchanged compared with the deployed release.
- Local HTML returns HTTP 200; generated dependencies exist. The pinned mobile mirror returns HTTP 200 with public CORS access.
- The new loading-gate tests use DOM stubs; they do not verify browser layout or rendering.
- Browser visual QA for this revision could not run: the browser tool's saved permission policy denied the local preview, including after the user explicitly authorized it. No physical iPhone/iPad or Safari performance measurements are claimed.

### Transfer observations

From the development machine during diagnosis, the original Pages mobile-model request took approximately 70.5 seconds; the pinned mirror took 35.8 seconds on a cold request and 7.25 seconds on a subsequent request. These measurements show why a second delivery route is useful, but are not an iPhone/iPad benchmark or a speed guarantee. The received mirror model was verified against the original SHA-256. The model itself is still 3,871,140 bytes uncompressed.

Cache behavior reference: https://developer.mozilla.org/en-US/docs/Web/API/Request/cache

## Deployment / rollback

Merge the PR into `gh-pages` to update the existing preview URL. This change has not modified the original homepage. All new resources live under `assets/renaissance-perf/`; reverting the preview HTML restores the previous runtime/model URLs because those files are retained.
