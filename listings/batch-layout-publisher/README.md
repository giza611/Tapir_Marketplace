> **Starter example.** This entry ships with the marketplace so the site has
> something to render before real submissions arrive. It links to the official
> [Tapir automation project](https://github.com/ENZYME-APD/tapir-archicad-automation)
> rather than to original code. Remove it once the catalogue has real listings.

## What it does

Walks the Publisher sets in the open project, selects the layout subsets you
name, and publishes each one to PDF. Every output file is named from the layout
ID and its current revision, so reissuing a drawing set does not silently
overwrite the previous issue.

## Why you would use it

Publishing a layout book by hand is the single most repeated task in a
documentation phase. Doing it through the Tapir JSON commands means the naming
convention is enforced by the script rather than by whoever happens to be at the
keyboard on a Friday afternoon.

## Requirements

- Archicad 27 or 28
- Tapir Add-On 1.1.0 or newer
- Python 3.10+ with the `archicad` package installed

## Usage

```python
from archicad import ACConnection

conn = ACConnection.connect()
acc, act = conn.commands, conn.types

# Confirm the Tapir Add-On is present before relying on its commands.
version = acc.ExecuteAddOnCommand(
    act.AddOnCommandId("TapirCommand", "GetAddOnVersion")
)
print(version)
```

## Notes

Run it against a copy of the project the first time. Publishing overwrites
files in the output folder, and there is no undo for a file written to disk.
