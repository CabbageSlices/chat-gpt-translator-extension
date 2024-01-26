var SINGLE_TRANSLATION_TEXT_LENGTH = 1000;
var BULK_TRANSLATION_CONTEXT_MESSAGE_LENGTH = 400;
var BULK_TRANSLATION_COMBINED_TEXT_LENGTH = SINGLE_TRANSLATION_TEXT_LENGTH - BULK_TRANSLATION_CONTEXT_MESSAGE_LENGTH;
var TRANSLATE_DELAY = 500;
var API_URL = "https://api.openai.com/v1/chat/completions";

var translations = []
async function getAPIKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('apiKey', (data) => {
            resolve(data.apiKey || '');
        });
    });
}

function splitText(text) {
    var replaced = text.replace(/\r\n/g, "\n\n");
    replaced = text.replace(/\n\n/g, "\n");
    const sentences = replaced.split(/\n/);
    const chunks = [];
    let chunk = '';

    sentences.forEach(sentence => {
        if (chunk.length + sentence.length > SINGLE_TRANSLATION_TEXT_LENGTH) {
            chunks.push(chunk);
            chunk = '';
        }
        chunk += sentence + "  \n  ";
    });

    if (chunk.trim().length > 1) {
        chunks.push(chunk);
    }

    var joinedChunks = chunks.join("  \n\n  ");
    if(joinedChunks.length < text.length)
    {
        console.error("large text split is somehow shorther than original text");
        throw "large text split is somehow shorther than original text"
    }

    return chunks;
}

function createSingleTranslationMessage(string) {
    return "translate the following text to English and only respond with the translated the text. Don't add any extra messages such as 'here is the translated result'. The text will contain special characters in the form of \n, these special characters  MUST be left AS IS in the final result. DO NOT MODIFY THE SPECIAL CHARACTERS WHILE TRANSLATING. Text:" + string
}

// if div only has paragraphs or text nodes then we want to process all the div t ext together, instead of 1 pargraph node at a time
function IsTextDiv(node) {
    if (node.tagName != 'DIV') {
        return false;
    }

    var numTextChildren = 0;
    var numNonTextChildren = 0;
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
        if (children[i].tagName !== 'P' && children[i].nodeType !== Node.TEXT_NODE && children[i].tagName !== 'BR' && children[i].tagName !== 'SPAN') {
            numNonTextChildren++;
            continue;
        }
        numTextChildren++
    }

    return numTextChildren > numNonTextChildren * 2 && numTextChildren > 0;
}

function getTextNodes(node) {
    let textNodes = [];
    if (node.nodeType === Node.TEXT_NODE || IsTextDiv(node)) {
        textNodes.push(node);
    } else {
        const children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
            textNodes = textNodes.concat(getTextNodes(children[i]));
        }
    }
    return textNodes;
}

function MarkTextTranslationInProgress(input) {

    return "<span class=\"gpt-translator-translation-in-progress\">" + input + "<\/span>";
}

function isEnglishUSKeyboard(str) {
    // The regex below matches English letters, numbers, and special characters found on a US keyboard
    const regex = /^[A-Za-z0-9 `~!@#$%^&*()-=_+[\]{}|;':",.\/\\<>?\r\n\t]*$/;
    return regex.test(str);
}

function getNodeText(node) {
    return node.innerText || node.textContent
}

function setPartialTranslation(node, newText) {
    if (node.tagName === 'DIV') {
        node.style.cssText += "white-space: pre-wrap;";
    }

    // setting innerhtml is unsafe, but allows adding new html elements, which is needed so partial translations can display translation in progress
    node.innerHTML = newText
}

function setNodeText(node, newText) {
    if (node.tagName === 'DIV') {
        node.style.cssText += "white-space: pre-wrap;";
    }

    if (node.innerText) {
        node.innerText = newText
    }
    else {
        node.textContent = newText
    }
}

function isWhitespace(str) {
    return /^\s*$/.test(str);
}

async function translate(dataToTranslate, translationMessageFormatter) {
    const apiKey = await getAPIKey();
    return new Promise((resolve, reject) => {
        if (!apiKey) {
            reject(new Error('API Key is required'));
            return;
        }

        const data = JSON.stringify({
            model: "gpt-3.5-turbo-16k",
            messages: [{ "role": "user", "content": translationMessageFormatter(dataToTranslate) }]
        });

        const xhr = new XMLHttpRequest();

        xhr.addEventListener("readystatechange", function () {
            if (this.readyState === this.DONE) {
                const response = JSON.parse(this.responseText);

                if (response.error != null) {
                    reject(response.error)
                } else {
                    const output = response.choices[0].message.content;
                    resolve(output);
                }
            }
        });

        xhr.open("POST", API_URL);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Authorization", `Bearer ${apiKey}`);
        xhr.send(data);
    });
}

async function translateLargeSingleText(input, displayPartialTranslationFunc = () => { }) {
    displayPartialTranslationFunc(MarkTextTranslationInProgress(input));
    const chunks = splitText(input);
    var translatedChunks = [];

    let translated = ""
    for (var i = 0; i < chunks.length; ++i) {
        let chunk = chunks[i];
        let output;

        if (isEnglishUSKeyboard(chunk)) {
            output = chunk
        }
        else {
            try {
                output = await translate(chunk, createSingleTranslationMessage);
                translatedChunks.push(output)
            } catch (error) {
                console.error('Error translating text:', error);
                alert("translateLargeSingleText Error");
            }
        }

        if(output == null || output.trim().length < chunk.length / 2)
        {
            console.error("Translated chunks is empty or only partially translated while attempting to translate: ", chunk)
            throw "Translated chunk is empty";
        }

        translated += output + "\n\n";

        if(i < chunks.length - 1)
        {
            const remainingUntranslated = MarkTextTranslationInProgress(chunks.slice(i + 1).join("\n\n"));
            displayPartialTranslationFunc(translated + '\n' + remainingUntranslated);
        }
        await delay(TRANSLATE_DELAY);
    }

    if(chunks.length != translatedChunks.length)
    {
        console.error("Translated chunks not equal to raw chunks")
        console.log("raw: ", chunks)
        console.log("translated: ", translatedChunks)
        throw "Translated chunks not equal to raw chunks";
    }

    return translated;
}

function sortTextNodeComparitor(node1, node2) {

    var node1Text = getNodeText(node1)
    var node2Text = getNodeText(node2)

    return node1Text.length > node2Text.length ? -1 : 1;
}

async function translateAll() {

    var textNodes = getTextNodes(document.body);
    textNodes = textNodes.sort(sortTextNodeComparitor);

    for (const node of textNodes) {

        const input = getNodeText(node);

        if (input == null || isWhitespace(input) || input.length < 70) {
            continue;
        }

        // no need to translate
        if (isEnglishUSKeyboard(input)) {
            continue;
        }

        try {
            const output = await translateLargeSingleText(input, (partialTranslation) => setPartialTranslation(node, partialTranslation));
            setNodeText(node, output);
        } catch (e) {
            console.log(e)
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    try {
        await translateAll();
    } catch (e) {
        console.log(e);
    }
    alert("GPT English Translation has finished translating.")
})();