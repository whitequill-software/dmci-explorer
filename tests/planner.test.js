import { test } from "node:test";
import assert from "node:assert/strict";
import { makeBrief } from "../src/planner.js";
test("exports selected preferences without losing free-text questions", () => {
  const result = makeBrief({
    bedrooms: "3 bedrooms",
    location: " Pasig ",
    priorities: ["Near school", "Home office"],
    budget: "₱8m",
    notes: "Can we visit on Saturday?",
  });
  assert.match(result, /Home size: 3 bedrooms/);
  assert.match(result, /Preferred location: Pasig\n/);
  assert.match(result, /Near school, Home office/);
  assert.match(result, /₱8m/);
  assert.match(result, /Can we visit on Saturday\?/);
  assert.match(result, /Not a reservation/);
});
test("empty optional fields produce a usable planning brief", () => {
  const result = makeBrief({
    bedrooms: "Still exploring",
    location: " ",
    priorities: [],
    budget: "",
    notes: "",
  });
  assert.match(result, /Preferred location: Still exploring/);
  assert.match(result, /Family priorities: To be decided/);
  assert.match(result, /Comfortable budget: To be discussed/);
  assert.match(result, /None yet\./);
});
