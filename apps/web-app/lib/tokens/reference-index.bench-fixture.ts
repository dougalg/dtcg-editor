/**
 * Generates a synthetic token set sized for the SC-010 performance budget:
 * 5,000 tokens whose longest reference chains reach depth 5. Built
 * programmatically rather than committed as JSON, so it stays cheap to
 * regenerate and can't silently drift from what it claims to measure.
 *
 * Layout: one file of literal tokens, plus five further files each
 * referencing the previous layer — `layer5.token_i` -> `layer4.token_i` ->
 * ... -> `layer1.token_i` -> `layer0.token_i` (a literal). That is 5
 * reference hops (`ChainStep`s) before reaching a literal value, i.e. chain
 * depth 5. Depth 5 and 5,000 tokens are properties of this fixture only —
 * neither is a cap the resolver itself enforces (see resolve-reference.ts).
 */

const LITERAL_LAYER_SIZE = 1000;
const REFERENCING_LAYER_COUNT = 5;
const REFERENCING_LAYER_SIZE = 800;

export interface RawTokenFile {
	readonly relativePath: string;
	readonly raw: string;
}

export const BENCHMARK_TOKEN_COUNT =
	LITERAL_LAYER_SIZE + REFERENCING_LAYER_COUNT * REFERENCING_LAYER_SIZE;

export const BENCHMARK_CHAIN_DEPTH = REFERENCING_LAYER_COUNT;

export function generateBenchmarkFixture(): readonly RawTokenFile[] {
	const files: RawTokenFile[] = [];

	const literalGroup: Record<string, unknown> = {};
	for (let i = 0; i < LITERAL_LAYER_SIZE; i++) {
		literalGroup[`token_${i}`] = {
			$type: "color",
			$value: { colorSpace: "srgb", components: [0, 0, 0] },
		};
	}
	files.push({
		relativePath: "layer0.tokens.json",
		raw: JSON.stringify({ layer0: literalGroup }),
	});

	for (let layer = 1; layer <= REFERENCING_LAYER_COUNT; layer++) {
		const group: Record<string, unknown> = {};
		const previousLayerName = `layer${layer - 1}`;
		const previousLayerSize =
			layer === 1 ? LITERAL_LAYER_SIZE : REFERENCING_LAYER_SIZE;
		for (let i = 0; i < REFERENCING_LAYER_SIZE; i++) {
			const targetIndex = i % previousLayerSize;
			group[`token_${i}`] = {
				$type: "color",
				$value: `{${previousLayerName}.token_${targetIndex}}`,
			};
		}
		files.push({
			relativePath: `layer${layer}.tokens.json`,
			raw: JSON.stringify({ [`layer${layer}`]: group }),
		});
	}

	return files;
}
