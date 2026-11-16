import type { PluginOpenScreenInput, PluginScreenProps } from "@getpaseo/plugin/client";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { DocumentScreen } from "./document-screen";
import { openScreenInputInTab } from "./file-tabs";
import { baseName, parentDir } from "./format";
import { openFileOf } from "./host-client";
import type { PanelSelection } from "./panel-reader";
import { documentScreen } from "./recent";
import { parseSiblings } from "./siblings";
import { makeStyles } from "./ui";

type ShowBesideChat = (workspaceId: string, selection: PanelSelection) => void;

// The document screen at its own route. With openFile, which saved links and history still reach, stepping
// and Show beside chat open a file tab in the workspace. Without it (COMPAT(viewerOpenFile)), stepping
// changes the document in place, so Close returns to the chat in one step however far it stepped, and
// Show beside chat reads the document in Documents in the explorer. The route keeps the document it was
// opened with, so a stepped document is named under the host's header, which still shows that one.
export function createDocumentScreen(showBesideChat: ShowBesideChat) {
  return function StandaloneDocumentScreen(props: PluginScreenProps) {
    const openFile = openFileOf(props.navigation);
    const routeKey = JSON.stringify(props.params);
    const [stepped, setStepped] = useState<{ routeKey: string; params: Record<string, string> } | null>(null);
    const params = stepped?.routeKey === routeKey ? stepped.params : props.params;
    const { workspaceId, path, siblings } = params;
    const styles = useMemo(() => makeStyles(props.theme, props.layout.compact), [props.theme, props.layout.compact]);
    const openDocument = (input: PluginOpenScreenInput) => {
      if (openFile && openScreenInputInTab(openFile, input)) return;
      if (input.params) setStepped({ routeKey, params: input.params });
    };
    const besideChat = workspaceId && path && (openFile || !props.layout.compact)
      ? () => {
          if (openFile && openScreenInputInTab(openFile, documentScreen(workspaceId, path, parseSiblings(siblings) ?? undefined))) return;
          showBesideChat(workspaceId, siblings ? { path, siblings } : { path });
        }
      : undefined;
    const steppedPath = params !== props.params && path ? path : null;
    return (
      <View style={{ flex: 1 }}>
        {steppedPath ? (
          <View style={styles.toolbar}>
            <Text style={[styles.text, { flex: 1, minWidth: 0 }]} numberOfLines={1} accessibilityLabel={steppedPath}>
              {baseName(steppedPath)}
              {parentDir(steppedPath) ? <Text style={styles.muted}>{`  ${parentDir(steppedPath)}`}</Text> : null}
            </Text>
          </View>
        ) : null}
        <DocumentScreen host={props.host} theme={props.theme} layout={props.layout} params={params} openDocument={openDocument} besideChat={besideChat} />
      </View>
    );
  };
}
