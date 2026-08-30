export interface GenerateLargeFixtureOptions {
	seed: number;
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

export function generateLargeFixture(
	options: GenerateLargeFixtureOptions,
): JsonObject {
	const rand = mulberry32(options.seed);
	const doc: JsonObject = {};

	for (let g = 0; g < GROUPS; g++) {
		const group: JsonObject = {};
		for (let s = 0; s < SUBGROUPS; s++) {
			const subgroup: JsonObject = {};
			for (let l = 0; l < LEAVES; l++) {
				subgroup[`token-${l}`] = {
					$type: "dimension",
					$value: `${Math.round(rand() * 64)}px`,
				};
			}
			group[`sub-${s}`] = subgroup;
		}
		doc[`group-${g}`] = group;
	}

	return doc;
}
