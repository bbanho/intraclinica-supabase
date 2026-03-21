# Legacy Status

`intraclinica-angular/` is legacy.

## Status

- Do not add new features here.
- Do not use this directory as the main application entrypoint.
- Active implementation should continue in [frontend](../frontend).

## Why

The repository contains two Angular applications with overlapping code and divergent evolution. The current engineering direction is to keep `frontend/` as canonical and treat this directory as an archive candidate.

## Next Step

This directory should be compared against `frontend/` for any still-needed deltas and then moved to an explicit archive path.
