import { parseReference, resolveReference } from "@dtcg-editor/token-core";
import type {
	ReferenceCandidate,
	ReferenceCatalogue,
	ResolutionChainWire,
} from "./reference-catalogue-wire.ts";
import {
	lookupForMode,
	type ReferenceIndex,
	type TokenDefinition,
} from "./reference-index.ts";

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

/**
 * The preview outcome for one of a candidate's own definitions: follow its
 * reference chain (per that definition's mode) when its value is a reference,
 * otherwise report the literal directly.
 */
function previewOutcome(
	path: readonly string[],
	def: TokenDefinition,
	index: ReferenceIndex,
): ResolutionChainWire {
	const reference = parseReference(def.value);
	if (reference !== undefined) {
		return resolveReference(reference, lookupForMode(index, def.mode));
	}
	return {
		steps: [{ path: [...path], file: def.file, mode: def.mode }],
		outcome: {
			kind: "resolved",
			value: def.value,
			type: def.effectiveType,
		},
	};
}

function candidateFor(
	path: readonly string[],
	defs: readonly TokenDefinition[],
	index: ReferenceIndex,
): ReferenceCandidate {
	return {
		path: [...path],
		displayPath: pathKey(path),
		effectiveType: defs.find((d) => d.effectiveType !== undefined)
			?.effectiveType,
		definitions: defs.map((d) => ({
			mode: d.mode,
			file: d.file,
			rawValue: d.value,
		})),
		preview: defs.map((d) => ({
			mode: d.mode,
			outcome: previewOutcome(path, d, index),
		})),
	};
}

/**
 * Turns feature 007's whole-directory `ReferenceIndex` into the flat
 * candidate catalogue the reference picker consumes: every distinct token
 * path once (group paths are never in `index.definitions`), with each
 * candidate's own per-mode resolved preview.
 */
export function buildReferenceCatalogue(
	index: ReferenceIndex,
): ReferenceCatalogue {
	const candidates: ReferenceCandidate[] = [];
	for (const [key, defs] of index.definitions) {
		const path = key.split(".");
		candidates.push(candidateFor(path, defs, index));
	}
	return { modes: [...index.modes], candidates };
}
