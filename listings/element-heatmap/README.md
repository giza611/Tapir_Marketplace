## What it does

Colour any elements in your model by any property, straight in Archicad's plan and 3D views. Use it to check column sizes, wall thicknesses, fire ratings, materials, IDs or any custom property at a glance.

**1. Pick the elements**
- Use the current selection, or the whole model.
- Filter by **type**, **layer** and **classification**, each with a search box.
- The three lists are linked: pick Column and the other two show only the layers and classifications your columns use, with element counts.
- A list with nothing picked includes everything.

**2. Pick the property**
- The list shows every property available on those elements, built-in and custom.
- Type to search, e.g. "width", "fire" or "material".

**3. Show the heatmap**
- **Numbers** (length, area, volume, angle) get a colour scale split into bins: Blue-Red, Viridis, Magma, Green-Red, Cool-Warm, Blues or Greys. Min/max are optional.
- **Text, list and yes/no values** get one colour per value: Bold, Pastel or Vivid.
- Elements without a value show in dark grey.
- Everything else in the model turns into a faint wireframe. You choose its colour and opacity, or keep it solid.

**Legend window**
- Opens next to Archicad and updates with every new heatmap.
- **Copy as text** gives value, count and colour, ready to paste into Excel or a slide.

**Also**
- **Clear** removes the highlight in one click.
- **Save CSV** exports every element's GUID, value and colour.
- Results are repeatable: the same model and settings always give the same colours.

## How to use

1. Open your project in Archicad with Tapir running.
2. Unzip and run `python3 element_heatmap_panel.py`.
3. Set the filters and press **Find elements**, pick a property, press **Show heatmap**.

Everything also runs from the command line:

    python3 element_heatmap.py --type Column --property "Column/Core Width" --style Magma
    python3 element_heatmap.py --clear

## Requirements

- Archicad with the Tapir Add-On (tested on Archicad 30 with Tapir 1.7.3)
- Python 3 with tkinter. No other packages needed.
  - Python from python.org includes tkinter.
  - With Homebrew Python: `brew install python-tk`

## Notes

- Numbers are in Archicad's base units: metres, m², m³ and radians.
- After changing the model, press **Reload lists** to re-read it.
