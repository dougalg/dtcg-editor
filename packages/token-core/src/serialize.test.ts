import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTokenFile } from "./parse.ts";
import { serializeTokenFile } from "./serialize.ts";

function roundTrip(raw: string) {
	const first = parseTokenFile(raw);
	if (!first.isOk()) {
		assert.fail("expected parseTokenFile to succeed on the original input");
	}

	const serialized = serializeTokenFile(first.value);
	if (!serialized.isOk()) {
		assert.fail("expected serializeTokenFile to succeed");
	}

	const second = parseTokenFile(serialized.value);
	if (!second.isOk()) {
		assert.fail(
			"expected parseTokenFile to succeed on the re-serialized output",
		);
	}

	return { first: first.value, second: second.value };
}

test("round-trips a simple valid token file (AC-07)", () => {
	const raw = JSON.stringify({
		color: {
			red: { $type: "color", $value: "#ff0000", $description: "Brand red" },
		},
	});

	const { first, second } = roundTrip(raw);
	assert.deepEqual(second, first);
});

test("round-trips nested groups with an inherited $type declared on an ancestor (AC-07)", () => {
	const raw = JSON.stringify({
		spacing: {
			$type: "dimension",
			small: { $value: "4px" },
			large: { $value: "16px", $type: "dimension" },
		},
	});

	const { first, second } = roundTrip(raw);
	assert.deepEqual(second, first);
});

test("round-trips unrecognized $-prefixed fields, including $extensions itself (AC-07)", () => {
	const raw = JSON.stringify({
		color: {
			red: {
				$type: "color",
				$value: "#ff0000",
				$extensions: { "com.example.tool": { foo: "bar" } },
				$customField: 42,
			},
		},
	});

	const { first, second } = roundTrip(raw);
	assert.deepEqual(second, first);
});

test("a reference $value survives parse -> serialize byte-identical (Principle IX)", () => {
	const raw = JSON.stringify({
		color: {
			brand: { blue: { $type: "color", $value: "#3366e6" } },
			action: {
				default: { $type: "color", $value: "{color.brand.blue}" },
			},
		},
	});

	const first = parseTokenFile(raw);
	if (!first.isOk()) {
		assert.fail("expected parseTokenFile to succeed on the original input");
	}
	const serialized = serializeTokenFile(first.value);
	if (!serialized.isOk()) {
		assert.fail("expected serializeTokenFile to succeed");
	}

	// Not just structurally equal after a second parse — the reference
	// text itself must appear in the serialized output completely
	// unchanged, since `serializeTokenFile` passes `$value` through
	// verbatim rather than re-typing or reformatting it.
	assert.match(serialized.value, /"\$value":\s*"\{color\.brand\.blue\}"/);

	const { first: reparsedFirst, second } = roundTrip(raw);
	assert.deepEqual(second, reparsedFirst);
});
