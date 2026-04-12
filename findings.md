# Findings

## 2026-04-12
- `tools/environments/local.py` hardcodes user-specific Windows Python paths under `C:\Users\zhrl5\...`, which breaks portability for other Windows users.
- `tools/environments/local.py` checks for an existing Windows system path using `startswith("c\\windows")`, which misses the drive-colon form (`C:\Windows`) and can repeatedly append fallback PATH entries.
- Existing Windows tests mainly cover process-group safety; they do not currently cover PATH sanitation or user-specific hardcoded Windows fallback paths.
- `LocalEnvironment.get_temp_dir()` only preferred POSIX temp paths from `TMPDIR`/`TMP`/`TEMP`; on Windows that can bypass valid temp overrides and return backslash paths that are awkward for Git Bash shell scripts.
- Normalizing Windows temp paths to forward-slash form (`C:/...`) keeps them usable from both Python file APIs and Git Bash redirections/source commands used by session snapshotting.
