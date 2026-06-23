#!/usr/bin/env sh
set -eu

mkdir -p .build-bin

python_path=""

for candidate in \
  /usr/bin/python3 \
  /opt/homebrew/opt/python@3.13/bin/python3.13 \
  /opt/homebrew/bin/python3.13 \
  /opt/homebrew/opt/python@3.12/bin/python3.12 \
  /opt/homebrew/bin/python3.12 \
  /opt/homebrew/opt/python@3.11/bin/python3.11 \
  /opt/homebrew/bin/python3.11 \
  "$(command -v python 2>/dev/null || true)" \
  "$(command -v python3 2>/dev/null || true)"
do
  if [ -n "$candidate" ] && [ -x "$candidate" ] && "$candidate" - <<'PY' >/dev/null 2>&1
import plistlib
from xml.parsers.expat import ParserCreate
PY
  then
    python_path="$candidate"
    break
  fi
done

if [ -z "$python_path" ]; then
  echo "Python with plistlib/pyexpat support is required by electron-builder, but none was found." >&2
  exit 1
fi

cat > .build-bin/python <<EOF
#!/usr/bin/env sh
exec "$python_path" "\$@"
EOF
chmod +x .build-bin/python

echo "Using python shim: .build-bin/python -> $python_path"
