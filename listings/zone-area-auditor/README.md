> **Starter example.** This entry ships with the marketplace so the site has
> something to render before real submissions arrive. It links to the official
> [Tapir automation project](https://github.com/ENZYME-APD/tapir-archicad-automation)
> rather than to original code. Remove it once the catalogue has real listings.

## What it does

Reads every zone in the project and reports three things:

1. Zones whose measured area differs from their target area by more than a
   tolerance you set
2. Zone numbers that appear more than once
3. Zones with no number at all

Output is a plain text report, ordered by storey.

## Why you would use it

Area schedules are contractual on most projects. Finding out at tender stage
that two rooms share a number, or that a zone was stretched and nobody updated
its target, is expensive. Running this before every issue is cheap.

## Requirements

- Archicad 28
- Tapir Add-On 1.1.0 or newer
- Python 3.10+ with the `archicad` package installed

## Interpreting the report

A drift warning is not automatically an error. Zones legitimately differ from
their target where a design has moved on and the brief has not. The report tells
you where to look; it does not tell you what is wrong.

## Notes

Read-only. It does not modify the project, so it is safe to run on a live file.
