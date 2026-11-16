import type { PluginOpenScreenInput } from "@getpaseo/plugin/client";
import { useSyncExternalStore } from "react";
import { extensionOf } from "../shared/kinds";
import { FILE_PANEL_EXTENSIONS } from "./file-panel";
import type { HostOpenFile } from "./host-client";
import { DOCUMENT_SCREEN_ID } from "./recent";
import { parseSiblings } from "./siblings";

// A Paseo file tab carries only its file, so the documents a tab steps through are kept here, per plugin
// client, by workspace and workspace path. The opener sets them; the last opener of a path wins, and an
// open tab of that path picks the change up.
const tabSiblings = new Map<string, readonly string[]>();
const listeners = new Set<() => void>();
const key = (workspaceId: string, path: string) => `${workspaceId}\0${path}`;
const VIEWER_EXTENSIONS = new Set(FILE_PANEL_EXTENSIONS);

// Stepping stays on files the viewer's tab shows: Previous or Next onto a PNG would land in Paseo's Image
// tab, which has no way on. A list with fewer than two such files has nothing to step through.
export function tabStepList(siblings: readonly string[] | null | undefined, path: string): readonly string[] | null {
  if (!siblings || !VIEWER_EXTENSIONS.has(extensionOf(path))) return null;
  const shown = siblings.filter((each) => VIEWER_EXTENSIONS.has(extensionOf(each)));
  return shown.length >= 2 && shown.includes(path) ? shown : null;
}

function setTabSiblings(id: string, steps: readonly string[] | null): void {
  if (steps) tabSiblings.set(id, steps);
  else tabSiblings.delete(id);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const tabSiblingsOf = (workspaceId: string, path: string): readonly string[] | null => tabSiblings.get(key(workspaceId, path)) ?? null;

export function useTabSiblings(workspaceId: string, path: string | undefined): readonly string[] | null {
  return useSyncExternalStore(subscribe, () => (path === undefined ? null : tabSiblingsOf(workspaceId, path)), () => null);
}

// Opens the document in a Paseo file tab, where Open location and the preview tab place it, and keeps
// the documents its tab steps through. openFile throws before opening anything, and then nothing is kept.
export function openInTab(openFile: HostOpenFile, workspaceId: string, path: string, siblings?: readonly string[] | null): void {
  const id = key(workspaceId, path);
  const before = tabSiblings.get(id) ?? null;
  setTabSiblings(id, tabStepList(siblings, path));
  try {
    openFile({ workspaceId, path });
  } catch (error) {
    setTabSiblings(id, before);
    throw error;
  }
}

// Opens a document screen input in a file tab instead. False when it is not a document, or openFile
// refused it (an unknown workspace or a path outside it), so the caller's own routing still shows it.
export function openScreenInputInTab(openFile: HostOpenFile, input: PluginOpenScreenInput): boolean {
  const { workspaceId, path, siblings } = input.params ?? {};
  if (input.screenId !== DOCUMENT_SCREEN_ID || !workspaceId || !path) return false;
  try {
    openInTab(openFile, workspaceId, path, parseSiblings(siblings));
    return true;
  } catch {
    return false;
  }
}
