// extension.js
const vscode = require('vscode');

let jsonSeparatorDecorationType;
let htmlSeparatorDecorationType;
let textSeparatorDecorationType;
let retDiagnostics;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Ritam Email Template extension activated.');

    retDiagnostics = vscode.languages.createDiagnosticCollection('ret');
    context.subscriptions.push(retDiagnostics);

    updateDecorations();

    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('ret.jsonSeperator') ||
            event.affectsConfiguration('ret.htmlSeperator') ||
            event.affectsConfiguration('ret.textSeperator')) {
            updateDecorations();
            applyDecorations();
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            applyDecorationsForEditor(editor);
            updateDiagnostics(editor.document);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && event.document === activeEditor.document) {
            applyDecorationsForEditor(activeEditor);
            updateDiagnostics(activeEditor.document);
        }
    }, null, context.subscriptions);

    if (vscode.window.activeTextEditor) {
        applyDecorationsForEditor(vscode.window.activeTextEditor);
        updateDiagnostics(vscode.window.activeTextEditor.document);
    }

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('ret', {
            provideCompletionItems(document, position) {
                const textBeforeCursor = document.lineAt(position.line).text.substring(0, position.character);
                if (textBeforeCursor.endsWith('{{')) {
                    const allVariables = getAllDeclaredVariables(document);
                    return allVariables.map(varName =>
                        new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable)
                    );
                }
                return undefined;
            }
        }, '{')
    );
}

/**
 * Validates the JSON structure against the predefined RETMeta type.
 * @param {vscode.TextDocument} document The text document containing the JSON.
 * @returns {vscode.Diagnostic[]} An array of diagnostics for JSON structure issues.
 */
function validateJsonStructure(document) {
    const diagnostics = [];
    const text = document.getText();
    const jsonBlockRegex = /---JSON---\s*\r?\n([\s\S]*?)---HTML---/i;
    const jsonMatch = text.match(jsonBlockRegex);

    if (!jsonMatch || !jsonMatch[1]) {
        return diagnostics;
    }

    const jsonContent = jsonMatch[1];
    const jsonBlockStartOffset = jsonMatch.index + jsonMatch[0].indexOf(jsonContent);

    try {
        const jsonData = JSON.parse(jsonContent);

        const allowedTopLevelProperties = new Set([
            'name', 'description', 'keywords', 'allowed', 'locale', 'variables', 'theme', 'license'
        ]);

        for (const key in jsonData) {
            if (Object.hasOwnProperty.call(jsonData, key)) {
                if (!allowedTopLevelProperties.has(key)) {
                    const keyRegex = new RegExp(`"${key}"\\s*:`, 'g');
                    let keyMatch = keyRegex.exec(jsonContent);
                    if (keyMatch) {
                        const startChar = jsonBlockStartOffset + keyMatch.index + 1;
                        const endChar = startChar + key.length;
                        const range = new vscode.Range(document.positionAt(startChar), document.positionAt(endChar));
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Unknown JSON property: '${key}'`,
                            vscode.DiagnosticSeverity.Warning
                        ));
                    }
                }
            }
        }

        if (typeof jsonData.name !== 'string' || !jsonData.name) {
            const nameKeyRegex = /"name"\s*:/g;
            let nameKeyMatch = nameKeyRegex.exec(jsonContent);
            let range;
            if (nameKeyMatch) {
                const startChar = jsonBlockStartOffset + nameKeyMatch.index + 1;
                const endChar = startChar + "name".length;
                range = new vscode.Range(document.positionAt(startChar), document.positionAt(endChar));
            } else {
                range = new vscode.Range(document.positionAt(jsonBlockStartOffset), document.positionAt(jsonBlockStartOffset + jsonContent.length));
                if (range.isEmpty) {
                    range = new vscode.Range(0, 0, 0, 1);
                }
            }
            diagnostics.push(new vscode.Diagnostic(
                range,
                `Missing or invalid 'name' property. 'name' must be a non-empty string.`,
                vscode.DiagnosticSeverity.Error
            ));
        }

        if (typeof jsonData.variables === 'undefined') {
            const range = new vscode.Range(document.positionAt(jsonBlockStartOffset), document.positionAt(jsonBlockStartOffset + jsonContent.length));
            diagnostics.push(new vscode.Diagnostic(
                range,
                `Mandatory property 'variables' is missing.`,
                vscode.DiagnosticSeverity.Error
            ));
        } else if (typeof jsonData.variables !== 'object' || jsonData.variables === null || Array.isArray(jsonData.variables)) {
            const varKeyRegex = /"variables"\s*:/g;
            let varKeyMatch = varKeyRegex.exec(jsonContent);
            let range;
            if (varKeyMatch) {
                const startChar = jsonBlockStartOffset + varKeyMatch.index + 1;
                const endChar = startChar + "variables".length;
                range = new vscode.Range(document.positionAt(startChar), document.positionAt(endChar));
            } else {
                range = new vscode.Range(document.positionAt(jsonBlockStartOffset), document.positionAt(jsonBlockStartOffset + jsonContent.length));
            }
            diagnostics.push(new vscode.Diagnostic(
                range,
                `'variables' property must be an object.`,
                vscode.DiagnosticSeverity.Error
            ));
        }

        if (jsonData.theme !== undefined && (typeof jsonData.theme !== 'object' || jsonData.theme === null || Array.isArray(jsonData.theme))) {
            const themeKeyRegex = /"theme"\s*:/g;
            let themeKeyMatch = themeKeyRegex.exec(jsonContent);
            let range;
            if (themeKeyMatch) {
                const startChar = jsonBlockStartOffset + themeKeyMatch.index + 1;
                const endChar = startChar + "theme".length;
                range = new vscode.Range(document.positionAt(startChar), document.positionAt(endChar));
            } else {
                range = new vscode.Range(document.positionAt(jsonBlockStartOffset), document.positionAt(jsonBlockStartOffset + jsonContent.length));
            }
            diagnostics.push(new vscode.Diagnostic(
                range,
                `'theme' property must be an object.`,
                vscode.DiagnosticSeverity.Error
            ));
        }


    } catch (e) {
        const parseErrorDiagnostic = new vscode.Diagnostic(
            new vscode.Range(document.positionAt(jsonBlockStartOffset), document.positionAt(jsonBlockStartOffset + jsonContent.length)),
            `JSON parsing error: ${e.message}. Please ensure your JSON is valid.`,
            vscode.DiagnosticSeverity.Error
        );
        diagnostics.push(parseErrorDiagnostic);
    }

    return diagnostics;
}

function updateDecorations() {
    const config = vscode.workspace.getConfiguration('ret');

    if (jsonSeparatorDecorationType) {
        jsonSeparatorDecorationType.dispose();
    }
    if (htmlSeparatorDecorationType) {
        htmlSeparatorDecorationType.dispose();
    }
    if (textSeparatorDecorationType) {
        textSeparatorDecorationType.dispose();
    }

    jsonSeparatorDecorationType = vscode.window.createTextEditorDecorationType({
        color: config.get('jsonSeperator', '#FFFF00'),
        fontWeight: 'bold'
    });

    htmlSeparatorDecorationType = vscode.window.createTextEditorDecorationType({
        color: config.get('htmlSeperator', '#E44D26'),
        fontWeight: 'bold'
    });

    textSeparatorDecorationType = vscode.window.createTextEditorDecorationType({
        color: config.get('textSeperator', '#008000'),
        fontWeight: 'bold'
    });
}

function applyDecorations() {
    vscode.window.visibleTextEditors.forEach(editor => {
        applyDecorationsForEditor(editor);
    });
}

/**
 * Applies decorations for a given text editor.
 * @param {vscode.TextEditor} editor
 */
function applyDecorationsForEditor(editor) {
    if (editor.document.languageId !== 'ret') {
        return;
    }

    const text = editor.document.getText();
    const jsonSeparators = [];
    const htmlSeparators = [];
    const textSeparators = [];

    const jsonRegex = /---JSON---/g;
    const htmlRegex = /---HTML---/g;
    const textRegex = /---TEXT---/g;

    let match;

    while ((match = jsonRegex.exec(text)) !== null) {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        jsonSeparators.push({ range: new vscode.Range(startPos, endPos) });
    }

    while ((match = htmlRegex.exec(text)) !== null) {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        htmlSeparators.push({ range: new vscode.Range(startPos, endPos) });
    }

    while ((match = textRegex.exec(text)) !== null) {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        textSeparators.push({ range: new vscode.Range(startPos, endPos) });
    }

    editor.setDecorations(jsonSeparatorDecorationType, jsonSeparators);
    editor.setDecorations(htmlSeparatorDecorationType, htmlSeparators);
    editor.setDecorations(textSeparatorDecorationType, textSeparators);
}


/**
 * Parses the document to extract declared variables from the JSON section.
 * @param {vscode.TextDocument} document
 * @returns {string[]} An array of declared variable names.
 */
function getAllDeclaredVariables(document) {
    const text = document.getText();
    const declaredVariables = new Set();
    const jsonBlockRegex = /---JSON---\s*\r?\n([\s\S]*?)---HTML---/i;
    const jsonMatch = text.match(jsonBlockRegex);

    if (jsonMatch && jsonMatch[1]) {
        try {
            const jsonContent = jsonMatch[1];
            const jsonData = JSON.parse(jsonContent);

            if (jsonData && typeof jsonData.variables === 'object' && jsonData.variables !== null && !Array.isArray(jsonData.variables)) {
                for (const varName in jsonData.variables) {
                    if (Object.hasOwnProperty.call(jsonData.variables, varName)) {
                        declaredVariables.add(varName);
                    }
                }
            }

            // Treat top-level properties of 'theme' as declared variables as well.
            if (jsonData && typeof jsonData.theme === 'object' && jsonData.theme !== null && !Array.isArray(jsonData.theme)) {
                for (const varName in jsonData.theme) {
                    if (Object.hasOwnProperty.call(jsonData.theme, varName)) {
                        declaredVariables.add(varName);
                    }
                }
            }

        } catch (e) {
            // JSON parsing errors are handled by validateJsonStructure
        }
    }
    return Array.from(declaredVariables);
}

/**
 * Finds all used variables (including those in control statements) in the HTML and Text sections.
 * @param {vscode.TextDocument} document
 * @returns {{name: string, range: vscode.Range, type: 'variable'|'loop_iterator'|'loop_array'|'if_condition'}[]}
 */
function getAllUsedVariables(document) {
    const usedVariables = [];
    const allRitamPatternsRegex = /\{\{((?:#if\s+([a-zA-Z_][a-zA-Z0-9_]*))|(?:#for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*))|([^#\/][^}]*?))\}\}/g;

    const text = document.getText();
    const htmlBlockRegex = /---HTML---\s*\r?\n([\s\S]*?)(?=---TEXT---|$)/i;
    const textBlockRegex = /---TEXT---\s*\r?\n([\s\S]*)$/i;

    const blocksToParse = [];

    let htmlMatch = text.match(htmlBlockRegex);
    if (htmlMatch && htmlMatch[1]) {
        blocksToParse.push({
            content: htmlMatch[1],
            startOffset: htmlMatch.index + htmlMatch[0].indexOf(htmlMatch[1])
        });
    }

    let textMatch = text.match(textBlockRegex);
    if (textMatch && textMatch[1]) {
        blocksToParse.push({
            content: textMatch[1],
            startOffset: textMatch.index + textMatch[0].indexOf(textMatch[1])
        });
    }

    for (const block of blocksToParse) {
        let match;
        while ((match = allRitamPatternsRegex.exec(block.content)) !== null) {
            let varName = null;
            let varType = 'variable';

            if (match[5]) { // Simple variable {{var}}
                varName = match[5].trim();
            } else if (match[2]) { // {{#if var}}
                varName = match[2].trim();
                varType = 'if_condition';
            } else if (match[4]) { // {{#for item in array}} - this is the array variable
                varName = match[4].trim();
                varType = 'loop_array';
            }

            if (varName) {
                let indexInMatch = match[0].indexOf(varName);
                if (indexInMatch === -1) {
                    if (match[0].includes(varName)) {
                        indexInMatch = match[0].indexOf(varName);
                    } else {
                        continue;
                    }
                }

                const startChar = block.startOffset + match.index + indexInMatch;
                const endChar = startChar + varName.length;

                const startPos = document.positionAt(startChar);
                const endPos = document.positionAt(endChar);

                usedVariables.push({ name: varName, range: new vscode.Range(startPos, endPos), type: varType });
            }
        }
    }
    return usedVariables;
}


/**
 * Extracts loop iterator variables (e.g., 'item' in {{#for item in array}})
 * and associates them with the range of their loop block.
 * @param {vscode.TextDocument} document
 * @returns {{name: string, loopRange: vscode.Range, declarationRange: vscode.Range}[]}
 */
function extractLocalLoopVariables(document) {
    const localLoopVariables = [];
    const text = document.getText();

    const forLoopBlockRegex = /\{\{#for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}([\s\S]*?)\{\{\/for\}\}/g;
    let match;

    while ((match = forLoopBlockRegex.exec(text)) !== null) {
        const loopIterator = match[1].trim();

        const loopStartPos = document.positionAt(match.index);
        const loopEndPos = document.positionAt(match.index + match[0].length);
        const loopRange = new vscode.Range(loopStartPos, loopEndPos);

        const iteratorDeclarationStartOffset = match.index + match[0].indexOf(loopIterator);
        const iteratorDeclarationEndOffset = iteratorDeclarationStartOffset + loopIterator.length;
        const declarationRange = new vscode.Range(document.positionAt(iteratorDeclarationStartOffset), document.positionAt(iteratorDeclarationEndOffset));

        localLoopVariables.push({
            name: loopIterator,
            loopRange: loopRange,
            declarationRange: declarationRange
        });
    }
    return localLoopVariables;
}


/**
 * Updates diagnostics (errors/warnings) for the document.
 * @param {vscode.TextDocument} document
 */
function updateDiagnostics(document) {
    if (document.languageId !== 'ret') {
        return;
    }

    let diagnostics = [];
    diagnostics = diagnostics.concat(validateJsonStructure(document));
    const declaredVariables = new Set(getAllDeclaredVariables(document));
    const allUsedVariables = getAllUsedVariables(document);
    const localLoopVariables = extractLocalLoopVariables(document);

    const usedVariableNamesForUnusedCheck = new Set();

    for (const { name, range, type } of allUsedVariables) {
        let isDeclared = declaredVariables.has(name);

        if (!isDeclared) {
            for (const loopVar of localLoopVariables) {
                if (loopVar.name === name && loopVar.loopRange.contains(range)) {
                    isDeclared = true;
                    break;
                }
            }
        }

        if (!isDeclared) {
            const diagnostic = new vscode.Diagnostic(
                range,
                `Undeclared variable: '${name}'`,
                vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
        }

        if (type !== 'loop_iterator') {
             usedVariableNamesForUnusedCheck.add(name);
        }
    }

    if (declaredVariables.size > 0) {
        for (const declaredVar of declaredVariables) {
            if (!usedVariableNamesForUnusedCheck.has(declaredVar)) {
                const declarationPosition = findDeclarationPosition(document, declaredVar);
                if (declarationPosition) {
                     const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(declarationPosition, declarationPosition.translate(0, declaredVar.length)),
                        `Unused variable: '${declaredVar}'`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostics.push(diagnostic);
                } else {
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(0,0,0,1),
                        `Unused variable: '${declaredVar}' (Declaration position not found)`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostics.push(diagnostic);
                }
            }
        }
    }

    retDiagnostics.set(document.uri, diagnostics);
}

/**
 * Helper to find the exact range of a declared variable within the JSON block for diagnostics.
 * @param {vscode.TextDocument} document
 * @param {string} varName
 * @returns {vscode.Position | null}
 */
function findDeclarationPosition(document, varName) {
    const text = document.getText();
    const jsonBlockRegex = /---JSON---\s*\r?\n([\s\S]*?)---HTML---/i;
    const jsonMatch = text.match(jsonBlockRegex);

    if (jsonMatch && jsonMatch[1]) {
        const jsonContent = jsonMatch[1];
        const jsonBlockStartOffset = jsonMatch.index + (jsonMatch[0].indexOf(jsonMatch[1]));

        const varKeyRegex = new RegExp(`"${varName}"\\s*:`, 'g');
        let match;
        while((match = varKeyRegex.exec(jsonContent)) !== null) {
            const absoluteStartOffset = jsonBlockStartOffset + match.index + 1;
            return document.positionAt(absoluteStartOffset);
        }
    }
    return null;
}


function deactivate() {
    if (jsonSeparatorDecorationType) {
        jsonSeparatorDecorationType.dispose();
    }
    if (htmlSeparatorDecorationType) {
        htmlSeparatorDecorationType.dispose();
    }
    if (textSeparatorDecorationType) {
        textSeparatorDecorationType.dispose();
    }
    if (retDiagnostics) {
        retDiagnostics.dispose();
    }
}

module.exports = {
    activate,
    deactivate
}