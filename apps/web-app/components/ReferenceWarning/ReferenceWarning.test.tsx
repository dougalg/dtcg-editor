import type { ResolutionChain } from "@dtcg-editor/token-core";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ReferenceWarning } from "./ReferenceWarning.tsx";

function chainWith(outcome: ResolutionChain["outcome"]): ResolutionChain {
	return {
		steps: [{ path: ["color", "a"], file: "a.json", mode: undefined }],
		outcome,
	};
}

test("renders a distinct message for an unresolved target, naming the missing path", () => {
	render(
		<ReferenceWarning
			chain={chainWith({
				kind: "unresolved",
				missingPath: ["color", "nope"],
			})}
		/>,
	);
	const alert = screen.getByRole("alert");
	expect(alert.textContent).toContain("color.nope");
	expect(alert.textContent).toMatch(/missing/i);
});

test("renders a distinct message for a group target, naming the group path", () => {
	render(
		<ReferenceWarning
			chain={chainWith({
				kind: "group-target",
				groupPath: ["color", "group"],
			})}
		/>,
	);
	const alert = screen.getByRole("alert");
	expect(alert.textContent).toContain("color.group");
	expect(alert.textContent).toMatch(/group/i);
});

test("renders a distinct message for a circular reference, naming the tokens forming the cycle", () => {
	render(
		<ReferenceWarning
			chain={{
				steps: [
					{ path: ["color", "a"], file: "a.json", mode: undefined },
					{ path: ["color", "b"], file: "a.json", mode: undefined },
				],
				outcome: { kind: "circular", cyclePath: ["color", "a"] },
			}}
		/>,
	);
	const alert = screen.getByRole("alert");
	expect(alert.textContent).toContain("color.a");
	expect(alert.textContent).toContain("color.b");
	expect(alert.textContent).toMatch(/circular/i);
});

test("all three variants render different text from each other", () => {
	const { container: unresolved } = render(
		<ReferenceWarning
			chain={chainWith({ kind: "unresolved", missingPath: ["x"] })}
		/>,
	);
	const { container: groupTarget } = render(
		<ReferenceWarning
			chain={chainWith({ kind: "group-target", groupPath: ["x"] })}
		/>,
	);
	const { container: circular } = render(
		<ReferenceWarning
			chain={chainWith({ kind: "circular", cyclePath: ["x"] })}
		/>,
	);
	const texts = [unresolved, groupTarget, circular].map((c) => c.textContent);
	expect(new Set(texts).size).toBe(3);
});

test("renders nothing activatable — no link, button, or other control role", () => {
	render(
		<ReferenceWarning
			chain={chainWith({ kind: "unresolved", missingPath: ["x"] })}
		/>,
	);
	expect(screen.queryByRole("link")).toBeNull();
	expect(screen.queryByRole("button")).toBeNull();
});

test("renders nothing for a resolved outcome", () => {
	const { container } = render(
		<ReferenceWarning
			chain={{
				steps: [],
				outcome: { kind: "resolved", value: "#000", type: "color" },
			}}
		/>,
	);
	expect(container.textContent).toBe("");
});
