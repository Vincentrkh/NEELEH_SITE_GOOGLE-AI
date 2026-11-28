import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocationsForDivision,
  getMenuDivision,
  isHeaderMenuLocation,
  isValidMenuLocation,
  MENU_LOCATIONS,
  PRESET_MENU,
} from "./menu-defaults.ts";

test("menu-defaults supports all 4 Academy and Office locations", () => {
  assert.deepEqual(MENU_LOCATIONS, ["header", "footer", "office_header", "office_footer"]);
  assert.equal(isValidMenuLocation("header"), true);
  assert.equal(isValidMenuLocation("office_header"), true);
  assert.equal(isValidMenuLocation("office_footer"), true);
  assert.equal(isValidMenuLocation("sidebar"), false);
});

test("division and header location helpers classify correctly", () => {
  assert.equal(getMenuDivision("header"), "academy");
  assert.equal(getMenuDivision("footer"), "academy");
  assert.equal(getMenuDivision("office_header"), "office");
  assert.equal(getMenuDivision("office_footer"), "office");

  assert.equal(isHeaderMenuLocation("header"), true);
  assert.equal(isHeaderMenuLocation("office_header"), true);
  assert.equal(isHeaderMenuLocation("footer"), false);
  assert.equal(isHeaderMenuLocation("office_footer"), false);

  assert.deepEqual(getLocationsForDivision("academy"), ["header", "footer"]);
  assert.deepEqual(getLocationsForDivision("office"), ["office_header", "office_footer"]);
});

test("PRESET_MENU contains non-empty valid defaults for every division slot", () => {
  for (const loc of MENU_LOCATIONS) {
    const items = PRESET_MENU.filter((m) => m.location === loc);
    assert.ok(items.length >= 4, `Expected >=4 preset items for ${loc}`);
    for (const item of items) {
      assert.ok(item.labelFa.length > 0);
      assert.ok(item.labelEn.length > 0);
      assert.ok(item.href.startsWith("/") || item.href.startsWith("#"));
    }
  }
});
