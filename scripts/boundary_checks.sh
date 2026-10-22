# MySFXKit boundary checks — SOURCED by scripts/check.sh, never executed on its own.
# Fixture tests: tests/boundary_checks_test.sh (run by the build/test command in check.sh).
# Both checks are DORMANT until their folders exist (the brief's §5 layout lands after the
# §5.1 format decision). Update GUARDED_* in the same commit if a folder lands under another name.

# 1. The playground and core never execute pasted text as code: recipes are data, validated
#    and interpreted (docs/MySFXKit_brief.md §5.1, §6; the site is public and serverless).
GUARDED_EVAL="playground core"
for guarded in $GUARDED_EVAL; do
  if [ -d "$guarded" ]; then
    hits=$(scan_grep '(^|[^A-Za-z0-9_.])(eval|Function)[[:space:]]*[()]|import[[:space:]]*\(' | grep -E "^$guarded/")
    if [ -n "$hits" ]; then
      echo "FAIL [boundary]: $guarded/ evaluates text as code (eval / Function / dynamic import):"
      echo "$hits"
      fail=1
    fi
  else
    echo "NOTE [boundary]: $guarded/ does not exist yet — its eval check is DORMANT."
  fi
done

# 2. core/ is engine-free: it never imports an adapter or the playground.
GUARDED_CORE="core"
if [ -d "$GUARDED_CORE" ]; then
  hits=$(scan_grep "(from|import|require)[[:space:]]*\(?[[:space:]]*['\"](\.\./|\./|/)*([^'\"]*/)?(adapters|playground)/" | grep -E "^$GUARDED_CORE/")
  if [ -n "$hits" ]; then
    echo "FAIL [boundary]: core imports an adapter or the playground:"
    echo "$hits"
    fail=1
  fi
else
  echo "NOTE [boundary]: $GUARDED_CORE/ does not exist yet — the core check is DORMANT."
fi
