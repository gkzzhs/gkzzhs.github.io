#!/bin/sh
# This Astro tree is not the production 3D portfolio source. Its old deploy
# performed rsync --delete against gh-pages and would remove the live site.
printf '%s\n' 'Deployment disabled: this legacy Astro source must not overwrite the live 3D portfolio.' >&2
exit 1
