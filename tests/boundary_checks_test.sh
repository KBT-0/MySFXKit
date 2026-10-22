#!/bin/sh
# Fixture tests for scripts/boundary_checks.sh: each case writes one file into a throwaway
# folder and sources the checks there. Never touches the checkout, never runs the build.
checks="$(pwd)/scripts/boundary_checks.sh" status=0
scan_grep() { grep -rHInE -e "$1" . | sed 's|^\./||'; }  # not find: a Windows PATH may name FIND.EXE
expect() {  # expect <red|green> <the check's FAIL line, or -> <path> <line of the file>
  dir=$(mktemp -d) && mkdir -p "$dir/$(dirname "$3")" && printf '%s\n' "$4" > "$dir/$3"
  out=$(cd "$dir" && fail=0 && . "$checks" 2>&1 && [ "$fail" = 0 ]); rc=$?
  rm -rf "$dir"
  case "$1:$rc" in
    red:0|green:[!0]*) printf '%s\n' "FAIL: $3 should turn the check $1: $out"; status=1 ;;
    red:*) case "$out" in *"$2"*) ;; *) printf '%s\n' "FAIL: $3 is red without '$2': $out"; status=1 ;; esac ;;
  esac
}
expect red 'FAIL [boundary]: playground/ evaluates text as code' playground/app.js 'const f = eval(recipeText);'
expect red 'FAIL [boundary]: playground/ evaluates text as code' playground/app.js 'const f = new Function("return " + recipeText);'
expect red 'FAIL [boundary]: playground/ evaluates text as code' playground/app.ts 'Function("return " + t)()'
expect red 'FAIL [boundary]: playground/ evaluates text as code' playground/app.ts 'eval (t)'
expect red 'FAIL [boundary]: playground/ evaluates text as code' playground/app.ts '(0, eval)(t)'
expect red 'FAIL [boundary]: playground/ evaluates text as code' playground/index.html 'const m = await import(recipeUrl);'
expect red 'FAIL [boundary]: core/ evaluates text as code' core/x.js 'const f = eval(recipeText);'
expect green - adapters/web/dev_only.js 'const f = eval(x);'
expect green - playground/search.js 'const r = retrieval(q);'
expect red 'FAIL [boundary]: core imports an adapter or the playground' core/graph.js "import { play } from '../adapters/web/index.js';"
expect red 'FAIL [boundary]: core imports an adapter or the playground' core/graph.js "const ui = require('../playground/ui.js');"
expect red 'FAIL [boundary]: core imports an adapter or the playground' core/graph.mjs "const m = await import('../adapters/web/x.js');"
expect red 'FAIL [boundary]: core imports an adapter or the playground' core/graph.js "const ui = require ('../playground/ui.js');"
expect red 'FAIL [boundary]: core imports an adapter or the playground' core/graph.js "import x from 'adapters/web/x.js';"
expect green - core/graph.js "import { Noise } from './blocks/noise.js';"
expect green - adapters/web/index.js "import { Graph } from '../../core/graph.js';"
[ "$status" = 0 ] && echo "boundary fixture tests: PASS"
exit "$status"
