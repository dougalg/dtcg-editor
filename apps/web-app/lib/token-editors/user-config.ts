import dtcgEditorConfig from "../../dtcg-editor.config.mts";

/**
 * Single re-export point for the repo-root-relative `dtcg-editor.config.mts`
 * path, so no other file needs to know/duplicate that relative path. Every
 * other consumer (client and server) imports this module instead.
 */
export default dtcgEditorConfig;
