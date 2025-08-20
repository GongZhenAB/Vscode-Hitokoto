const vscode = require("vscode");
const axios = require("axios");
const open = require("open");

/**
 * @param {vscode.ExtensionContext} context
 */

let hitokotoText;
let hitokotoBtn;

function activate(context) {
    const hitokoto = {
        id: null,
        text: null,
        intervalTimeFlag: null,
    };

    const getText = vscode.commands.registerCommand(
        "extension.hitokoto",
        function () {
            getHitokoto(hitokoto);
        }
    );

    const openUrl = vscode.commands.registerCommand(
        "extension.openHitokoto",
        function () {
            open(`https://hitokoto.cn?id=${hitokoto.id}`);
        }
    );

    const insertHitokoto = vscode.commands.registerCommand(
        "extension.insertHitokoto",
        function () {
            if (hitokoto.text) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    editor.edit((editBuilder) => {
                        const position = editor.selection.active;
                        const textToInsert = hitokoto.text;
                        editBuilder.insert(position, textToInsert);
                    });
                } else {
                    vscode.window.showWarningMessage("没有活动的文本编辑器");
                }
            } else {
                vscode.window.showWarningMessage("没有可插入的一言");
            }
        }
    );

    context.subscriptions.push(getText);
    context.subscriptions.push(openUrl);
    context.subscriptions.push(insertHitokoto);

    createHitokoto(hitokoto);

    createInterval(hitokoto);

    vscode.workspace.onDidChangeConfiguration(() => {
        createInterval(hitokoto);
    });
}

/**
 *  create a intervallic hitokoto
 *  @param {object} hitokoto
 */
function createInterval(hitokoto) {
    clearInterval(hitokoto.intervalTimeFlag);
    const intervalOption = vscode.workspace
        .getConfiguration()
        .get("hitokoto.refreshInterval");
    if (intervalOption !== "off") {
        hitokoto.intervalTimeFlag = setInterval(() => {
            getHitokoto(hitokoto);
        }, intervalOption * 1000 * 60);
    }
}

/**
 * create a hitokoto barItem
 * @param {object} hitokoto
 */
function getHitokoto(hitokoto) {
    const apiUrl = vscode.workspace.getConfiguration().get("hitokoto.api");
    const selectedTypes = vscode.workspace
        .getConfiguration()
        .get("hitokoto.types");
    const typeParam =
        selectedTypes && selectedTypes.length > 0
            ? `c=${selectedTypes.join(",")}`
            : "";
    const api = typeParam ? `${apiUrl}?${typeParam}` : apiUrl;
    axios
        .get(api)
        .then((res) => {
            hitokoto["id"] = res.data.id;
            hitokoto["text"] = `${res.data.hitokoto} ——${res.data.from}`;
            showHitokoto(hitokoto);
        })
        .catch(() => {
            vscode.window
                .showErrorMessage("获取一言失败", "重试")
                .then((selection) => {
                    if (selection === "重试") {
                        getHitokoto(hitokoto);
                    }
                });
        });
}

function createHitokoto(hitokoto) {
    hitokotoText = vscode.window.createStatusBarItem(2, 100);
    hitokotoText.text = "获取一言中...";
    hitokotoText.show();

    hitokotoBtn = vscode.window.createStatusBarItem(2, 100);
    hitokotoBtn.text = `$(refresh)`;
    hitokotoBtn.tooltip = "刷新一言";
    hitokotoBtn.command = "extension.hitokoto";
    hitokotoBtn.show();

    getHitokoto(hitokoto);
}

function showHitokoto(hitokoto) {
    hitokotoText.text = hitokoto.text;
    hitokotoText.tooltip = "点击查看该条目";
    hitokotoText.command = `extension.openHitokoto`;
}

exports.activate = activate;

function deactivate() {}
module.exports = {
    activate,
    deactivate,
};
