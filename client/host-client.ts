import type { PluginClientContext, PluginOpenScreenInput } from "@getpaseo/plugin/client";
import type { HostPlayAudio } from "./media";

let hostClient: PluginClientContext | null = null;

export function setHostClient(client: PluginClientContext | null): void {
  hostClient = client;
}

// playAudio arrived in Paseo after 0.11.2, so look it up at runtime instead of requiring it.
export function getPlayAudio(): HostPlayAudio | null {
  const play = (hostClient as unknown as { playAudio?: HostPlayAudio } | null)?.playAudio;
  return typeof play === "function" ? play.bind(hostClient) : null;
}

export function openHostScreen(input: PluginOpenScreenInput): void {
  hostClient?.openScreen(input);
}

// Paseo's openFile, typed here because the SDK the plugin builds against (0.13.0) predates it.
export interface HostOpenFileInput {
  workspaceId: string;
  path: string;
  lineStart?: number;
  serverId?: string;
}
export type HostOpenFile = (input: HostOpenFileInput) => void;

// COMPAT(viewerOpenFile): openFile opens a document in a Paseo file tab, like a Files-tree click; it is on
// the client, command contexts and screen and panel `navigation` in fork builds from 2026-11-16, and on no
// published Paseo yet. Hosts without it keep the viewer's own routing (Documents in place or in the
// explorer, the document screen). Remove the fallback once the manifest requires a Paseo whose SDK has openFile.
export function openFileOf(holder: unknown): HostOpenFile | null {
  const open = (holder as { openFile?: unknown } | null | undefined)?.openFile;
  return typeof open === "function" ? (open as HostOpenFile).bind(holder) : null;
}

// The app either has openFile or not, whichever host a plugin client belongs to, so any client answers.
// Calls go through the opener of the host that owns the workspace (the client or the surface's
// navigation), not through this one.
export function hostOpensFiles(): boolean {
  return openFileOf(hostClient) !== null;
}
