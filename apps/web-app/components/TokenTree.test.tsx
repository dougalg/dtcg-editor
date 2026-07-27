import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TokenTree } from "./TokenTree.tsx";
import type { PlainDtcgNode } from "../lib/tokens/plain-node.ts";

function tree(): PlainDtcgNode {
  return {
    kind: "group",
    name: "",
    path: [],
    declaredType: undefined,
    effectiveType: undefined,
    description: undefined,
    deprecated: undefined,
    children: [
      {
        kind: "token",
        name: "small",
        path: ["small"],
        value: { value: 4, unit: "px" },
        declaredType: "dimension",
        effectiveType: "dimension",
        description: "Small spacing",
        deprecated: undefined,
      },
      {
        kind: "token",
        name: "large",
        path: ["large"],
        value: { value: 16, unit: "px" },
        declaredType: "dimension",
        effectiveType: "dimension",
        description: undefined,
        deprecated: undefined,
      },
      {
        kind: "token",
        name: "red",
        path: ["red"],
        value: "#ff0000",
        declaredType: "color",
        effectiveType: "color",
        description: undefined,
        deprecated: undefined,
      },
    ],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("shows editable controls for a dimension token but not for other types (AC-01)", () => {
  render(<TokenTree node={tree()} relativePath="tokens.json" />);

  expect(screen.getByLabelText("small name")).toBeTruthy();
  expect(screen.getAllByLabelText("Dimension value").length).toBe(2);

  expect(screen.getByText("#ff0000")).toBeTruthy();
  expect(screen.queryByLabelText("red name")).toBeNull();
});

test("rejects a rename that collides with a sibling and does not stage it (AC-03)", () => {
  render(<TokenTree node={tree()} relativePath="tokens.json" />);

  const nameInput = screen.getByLabelText("small name");
  fireEvent.change(nameInput, { target: { value: "large" } });

  expect(screen.getByText(/already exists/)).toBeTruthy();
  const saveButton = screen.getByRole("button", { name: /save/i }) as HTMLButtonElement;
  expect(saveButton.disabled).toBe(true);
});

test("allows staging a rename into a name another pending edit just freed up", () => {
  render(<TokenTree node={tree()} relativePath="tokens.json" />);

  // Rename "large" away first, freeing up "large" for "small" to claim in the
  // same (unsaved) session — this must not be blocked by a stale check that
  // only looks at the last-saved tree.
  fireEvent.change(screen.getByLabelText("large name"), { target: { value: "big" } });
  fireEvent.change(screen.getByLabelText("small name"), { target: { value: "large" } });

  expect(screen.queryByText(/already exists/)).toBeNull();
  const saveButton = screen.getByRole("button", { name: /save/i }) as HTMLButtonElement;
  expect(saveButton.disabled).toBe(false);
});

test("keeps a pending edit visible and editable after a failed save (AC-06)", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "disk full" }), { status: 500 })),
  );

  render(<TokenTree node={tree()} relativePath="tokens.json" />);

  const nameInput = screen.getByLabelText("small name");
  fireEvent.change(nameInput, { target: { value: "tiny" } });

  const saveButton = screen.getByRole("button", { name: /save/i }) as HTMLButtonElement;
  expect(saveButton.disabled).toBe(false);
  fireEvent.click(saveButton);

  await vi.waitFor(() => {
    expect(screen.getByText("disk full")).toBeTruthy();
  });

  expect(screen.getByLabelText("small name")).toHaveProperty("value", "tiny");
  expect(saveButton.disabled).toBe(false);
});
