"use client";

import { useState } from "react";
import type { PlainDtcgNode } from "../lib/tokens/plain-node.ts";
import styles from "./TokenTree.module.css";

function formatValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function TreeNode({ node }: { node: PlainDtcgNode }) {
  const [expanded, setExpanded] = useState(true);

  if (node.kind === "token") {
    return (
      <li className={styles.token}>
        <span className={styles.name}>{node.name}</span>
        {node.effectiveType !== undefined && <span className={styles.type}>{node.effectiveType}</span>}
        <span className={styles.value}>{formatValue(node.value)}</span>
      </li>
    );
  }

  return (
    <li className={styles.group}>
      <button type="button" className={styles.toggle} onClick={() => setExpanded((value) => !value)}>
        {expanded ? "▾" : "▸"} {node.name || "/"}
      </button>
      {expanded && (
        <ul className={styles.children}>
          {node.children.map((child) => (
            <TreeNode key={child.path.join(".")} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TokenTree({ node }: { node: PlainDtcgNode }) {
  return (
    <ul className={styles.root}>
      <TreeNode node={node} />
    </ul>
  );
}
