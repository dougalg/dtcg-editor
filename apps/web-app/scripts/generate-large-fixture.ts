export interface GenerateLargeFixtureOptions {
	seed: number;
}

export interface WriteLargeFixtureOptions extends GenerateLargeFixtureOptions {
	outPath: string;
	/** Injected so the pure generator stays I/O-free (constitution Principle VI). */
	writeFile: (path: string, contents: string) => void;
}

interface JsonObject {
	[key: string]: unknown;
}

/**
 * mulberry32 — a tiny deterministic PRNG. Given the same 32-bit seed it always
 * produces the same sequence, which is what makes the generated fixture
 * reproducible (and safe to commit).
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d_2b_79_f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}

// 10 groups x 10 subgroups x 20 leaves = 2,000 tokens at group depth 3.
const GROUPS = 10;
const SUBGROUPS = 10;
const LEAVES = 20;

// One widely-referenced "hub" token, and how many leaves point at it — the
// SC-005 / C-LR-8 scenario (editing a token referenced by >= 100 others).
const HUB_PATH = "group-0.sub-0.token-0";
const HUB_REFERRERS = 130;

/**
 * One token of every editable dispatch path, emitted first so a Tab-through
 * reaches each editor kind within a few stops (SC-003). Order:
 * color -> dimension -> reference -> unregistered-type (fallback) ->
 * invalid-value-for-type.
 *
 * "exotic" uses `gradient` as the still-unregistered-type exemplar — it has
 * no dedicated built-in editor (unlike `cubicBezier`, `fontFamily`, and
 * `shadow`, which each gained one and would no longer exercise the
 * JSON-textarea fallback path this fixture is for).
 */
function dispatchShowcase(): JsonObject {
	return {
		color: { $type: "color", $value: "#3366cc" },
		dimension: { $type: "dimension", $value: { value: 8, unit: "px" } },
		reference: { $type: "dimension", $value: `{${HUB_PATH}}` },
		exotic: {
			$type: "gradient",
			$value: [
				{ color: "#000", position: 0 },
				{ color: "#fff", position: 1 },
			],
		},
		broken: { $type: "dimension", $value: "definitely-not-a-dimension" },
	};
}

export function generateLargeFixture(
	options: GenerateLargeFixtureOptions,
): JsonObject {
	const rand = mulberry32(options.seed);
	const doc: JsonObject = { _showcase: dispatchShowcase() };

	let leafIndex = 0;
	for (let g = 0; g < GROUPS; g++) {
		const group: JsonObject = {};
		for (let s = 0; s < SUBGROUPS; s++) {
			const subgroup: JsonObject = {};
			for (let l = 0; l < LEAVES; l++) {
				const path = `group-${g}.sub-${s}.token-${l}`;
				// Point the first HUB_REFERRERS non-hub leaves at the hub;
				// everything else holds a literal dimension.
				const isReferrer =
					path !== HUB_PATH && leafIndex > 0 && leafIndex <= HUB_REFERRERS;
				subgroup[`token-${l}`] = isReferrer
					? { $type: "dimension", $value: `{${HUB_PATH}}` }
					: {
							$type: "dimension",
							$value: { value: Math.round(rand() * 64), unit: "px" },
						};
				leafIndex++;
			}
			group[`sub-${s}`] = subgroup;
		}
		doc[`group-${g}`] = group;
	}

	return doc;
}

/** Serialize the pure fixture and hand it to the injected writer. No `fs` here. */
export function writeLargeFixture(options: WriteLargeFixtureOptions): void {
	const contents = `${JSON.stringify(generateLargeFixture(options), null, 2)}\n`;
	options.writeFile(options.outPath, contents);
}
