import { useCallback } from "react";
// Every call in page order, marked settled before its caller resumes, so a check made after the
// settled mark has seen anything the caller sent in response.
const calls: { method: string; input: unknown; settled: boolean }[] = [];
(window as any).__rpcCalls = calls;
export async function recordCall<T>(method: string, input: unknown, run: () => Promise<T>): Promise<T> {
  const call = { method, input, settled: false };
  calls.push(call);
  try {
    return await run();
  } finally {
    call.settled = true;
  }
}
export function callRpc(contract: { name: string }, input: unknown): Promise<unknown> {
  return recordCall(contract.name, input, async () => {
    const response = await fetch("/rpc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: contract.name, input }) });
    const value: any = await response.json();
    if (value.error) throw new Error(value.error);
    return value;
  });
}
export function useRpc(contract: { name: string }) {
  return useCallback((input: unknown) => callRpc(contract, input), [contract.name]);
}
export function usePaseo() {
  return (globalThis as any).__fakePaseo;
}
// Paseo's openFile, as a host from 2026-11-16 has it on the client, command contexts and `navigation`.
// Calls are recorded in order; ?openFile=<workspace root> in the app turns it on and shows the opened file.
const openedFiles: { workspaceId: string; path: string; lineStart?: number }[] = [];
(window as any).__openedFiles = openedFiles;
let showFile: (path: string) => void = () => {};
export function onOpenFile(show: (path: string) => void): void {
  showFile = show;
}
export function openFile(input: { workspaceId: string; path: string; lineStart?: number }): void {
  if (typeof input?.workspaceId !== "string" || !input.workspaceId || typeof input.path !== "string" || !input.path) throw new Error("openFile takes { workspaceId, path, lineStart?, serverId? }");
  if (input.workspaceId !== "workspace") throw new Error("openFile: Workspace is unavailable on the requested host.");
  openedFiles.push(input);
  showFile(input.path);
}
