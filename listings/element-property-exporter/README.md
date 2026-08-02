> **Starter example.** This entry ships with the marketplace so the site has
> something to render before real submissions arrive. It links to the official
> [Tapir automation project](https://github.com/ENZYME-APD/tapir-archicad-automation)
> rather than to original code. Remove it once the catalogue has real listings.

## What it does

Takes whatever is currently selected in Archicad, reads the properties you list
in a small config block, and writes one CSV row per element. Classification
values and element IDs come along as columns, so the output drops straight into
a cost plan or a data-validation sheet.

## Why you would use it

Archicad's own schedules are excellent inside Archicad and awkward the moment
someone asks for the data in a spreadsheet. This exists for the moment a QS asks
for "just a list of every door with its fire rating" and you would rather not
rebuild a schedule layout to answer it.

## Requirements

- Archicad 26, 27 or 28
- Tapir Add-On 1.1.0 or newer for the classification columns (1.0.0 works
  without them)
- Python 3.10+ with the `archicad` package installed

## Output

The file is written as UTF-8 **with** a byte-order mark. That is deliberate:
without it Excel on Windows mangles any non-ASCII character in a property
value, which matters immediately for any project not in English.

## Notes

Exporting a very large selection is bounded by how fast Archicad answers
property requests, not by the script. A whole-building selection can take a
while — select by storey if you are in a hurry.
