/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018-2022 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { editor, languages } from "monaco-editor";
import {
    createConfiguredEditor,
    createModelReference,
    IReference,
    ITextFileEditorModel,
} from "vscode/monaco";
import "@codingame/monaco-vscode-theme-defaults-default-extension";
import "@codingame/monaco-vscode-json-default-extension";
import getConfigurationServiceOverride from "@codingame/monaco-vscode-configuration-service-override";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getTextmateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import { initServices, MonacoLanguageClient } from "monaco-languageclient";
import {
    CloseAction,
    ErrorAction,
    MessageTransports,
} from "vscode-languageclient";
import {
    WebSocketMessageReader,
    WebSocketMessageWriter,
    toSocket,
} from "vscode-ws-jsonrpc";
import { Uri } from "vscode";
import raw from "/Users/avii/Desktop/monaco-languageclient/packages/examples/src/common/catalog.xml";

export const createLanguageClient = (
    transports: MessageTransports
): MonacoLanguageClient => {
    return new MonacoLanguageClient({
        name: "Sample Language Client",
        clientOptions: {
            // use a language id as a document selector
            documentSelector: ["oml"],
            // disable the default error handler
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart }),
            },
            workspaceFolder: {
                index: 0,
                name: "workspace",
                uri: Uri.parse("/workspace"),
            },
        },
        // create a language client connection from the JSON RPC connection on demand
        connectionProvider: {
            get: () => {
                return Promise.resolve(transports);
            },
        },
    });
};

export const createUrl = (
    hostname: string,
    port: number,
    path: string,
    searchParams: Record<string, any> = {},
    secure: boolean = location.protocol === "https:"
): string => {
    const protocol = secure ? "wss" : "ws";
    const url = new URL(`${protocol}://${hostname}:${port}${path}`);

    for (let [key, value] of Object.entries(searchParams)) {
        if (value instanceof Array) {
            value = value.join(",");
        }
        if (value) {
            url.searchParams.set(key, value);
        }
    }

    return url.toString();
};

export const createWebSocketAndStartClient = (url: string): WebSocket => {
    const webSocket = new WebSocket(url);
    webSocket.onopen = () => {
        const socket = toSocket(webSocket);
        const reader = new WebSocketMessageReader(socket);
        const writer = new WebSocketMessageWriter(socket);
        const languageClient = createLanguageClient({
            reader,
            writer,
        });
        languageClient.start();
        reader.onClose(() => languageClient.stop());
    };
    return webSocket;
};

export const createDefaultJsonContent = (): string => {
    return `{
    "$schema": "http://json.schemastore.org/coffeelint",
    "line_endings": "unix"
}`;
};

export type ExampleJsonEditor = {
    languageId: string;
    editor: editor.IStandaloneCodeEditor;
    uri: Uri;
    modelRef: IReference<ITextFileEditorModel>;
};

export const performInit = async (vscodeApiInit: boolean) => {
    if (vscodeApiInit === true) {
        await initServices({
            userServices: {
                ...getThemeServiceOverride(),
                ...getTextmateServiceOverride(),
                ...getConfigurationServiceOverride(),
                ...getKeybindingsServiceOverride(),
            },
            debugLogging: true,
            workspaceConfig: {
                workspaceProvider: {
                    trusted: true,
                    workspace: {
                        workspaceUri: Uri.file("/workspace"),
                    },
                    async open() {
                        return false;
                    },
                },
            },
        });

        // register the JSON language with Monaco
        languages.register({
            id: "oml",
            extensions: [".oml"],
            aliases: ["OML", "oml"],
            mimetypes: ["application/oml"],
        });
    }
};

export const createJsonEditor = async (config: {
    htmlElement: HTMLElement;
    content: string;
}) => {
    // create the model
    const uri = Uri.parse("/workspace/vocabulary/pizza.oml");
    const modelRef = await createModelReference(uri, config.content);
    modelRef.object.setLanguageId("oml");

    //     const catalogRef = await createModelReference(
    //         Uri.parse("/workspace/catalog.xml"),
    // "
    //     );
    // const catalogCode = fs.readFileSync(
    //     "/Users/avii/Desktop/monaco-languageclient/packages/examples/src/common/catalog.xml",
    //     "utf-8"
    // );
    const rawText = await fetch(raw);
    const xmlText = await rawText.text();
    const catalogRef = await createModelReference(
        Uri.parse("/workspace/catalog.xml"),
        xmlText
    );

    // create monaco editor
    const editor = createConfiguredEditor(config.htmlElement, {
        model: modelRef.object.textEditorModel,
        glyphMargin: true,
        lightbulb: {
            enabled: true,
        },
        automaticLayout: true,
        wordBasedSuggestions: false,
    });

    const result = {
        editor,
        uri,
        modelRef,
    } as ExampleJsonEditor;
    return Promise.resolve(result);
};
