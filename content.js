var SINGLE_TRANSLATION_TEXT_LENGTH = 850;
var BULK_TRANSLATION_MESSAGE_LENGTH = 230;
var BULK_TRANSLATION_COMBINED_TEXT_LENGTH = SINGLE_TRANSLATION_TEXT_LENGTH - BULK_TRANSLATION_MESSAGE_LENGTH;
var TRANSLATE_DELAY = 1000;
var API_URL = "https://api.openai.com/v1/chat/completions";

async function getAPIKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('apiKey', (data) => {
            resolve(data.apiKey || '');
        });
    });
}

function splitText(text) {
    const replaced = text.replace(/\r\n/g, ".\n\n");
    const paragraphs = replaced.split(/\.\n\n/);
    const chunks = [];
    let chunk = '';

    paragraphs.forEach(paragraph => {
        if (chunk.length + paragraph.length > SINGLE_TRANSLATION_TEXT_LENGTH) {
            chunks.push(chunk);
            chunk = '';
        }
        chunk += paragraph + '\n\n';
    });

    if (chunk.trim().length > 1) {
        chunks.push(chunk);
    }

    return chunks;
}

async function translate(dataToTranslate, translationMessageFormatter) {
    const apiKey = await getAPIKey();
    return new Promise((resolve, reject) => {
        if (!apiKey) {
            reject(new Error('API Key is required'));
            return;
        }

        const data = JSON.stringify({
            model: "gpt-3.5-turbo",
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

function createBulkTranslationMessage(stringArray) {
    return `I will provide an array of strings in the form ["string", "string"]. 
    translate each string inside the array directly to English. Don't Summarize or shorten the final result. Provide an exact translation only.
    Return an array of translated strings in the same order as the input. the result should ONLY be an array of translated strings, and nothing else. The resulting array must be the same size as the input array. ${JSON.stringify(stringArray)} `
}

function createSingleTranslationMessage(string) {
    return "translate directly to English. Don't Summarize or shorten the final result. Provide an exact translation only: " + string
}

// if div only has paragraphs or text nodes then we want to process all the div t ext together, instead of 1 pargraph node at a time
function IsTextDiv(node) {

    if (node.tagName != 'DIV') {
        return false;

    }

    var numTextChildren = 0;
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
        if (children[i].tagName !== 'P' && children[i].nodeType !== Node.TEXT_NODE && children[i].tagName !== 'BR' && children[i].tagName !== 'SPAN') {
            continue;
        }
        numTextChildren++

    }

    return numTextChildren > children.length / 2 && children.length > 4;
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

async function translateLargeSingleText(input) {
    const chunks = splitText(input);

    let translated = ""
    for (let chunk of chunks) {
        let output;

        try {
            output = await translate(chunk, createSingleTranslationMessage);
        } catch (error) {
            console.error('Error translating text:', error);
            throw error;
        }

        translated += output + '\n';
        await delay(TRANSLATE_DELAY);
    }

    return translated;
}

async function bulkTranslateNodes(nodes) {

    if(nodes.length == 0)
    {
        return;
    }

    // we know that combined string of bulk translated nodes is smaller than chunk size, so put them all in one string array to translate
    const texts = nodes.map(getNodeText)
    let translatedTexts = []
    try {
        output = await translate(texts, createBulkTranslationMessage);
        translatedTexts = JSON.parse(output)
    } catch (error) {
        console.error('Error translating text:', error);
        throw error;
    }

    for (let i = 0; i < nodes.length; ++i) {
        setNodeText(nodes[i], translatedTexts[i]);
    }
}

function getNodeText(node){
    return node.innerText || node.textContent
}

function setNodeText(node, newText) {
    if(node.tagName === 'DIV')
    {
        node.style.cssText += "white-space: pre-wrap;";
    }
    node.textContent = newText
}

function isWhitespace(str) {
    return /^\s*$/.test(str);
  }

async function translateAll() {
    console.log("~~~~~~~STARTING TRANSLATION")
    const textNodes = getTextNodes(document.body);
    let currentCombinedTextLength = 0;
    let bulkTranslatedNodes = []
    for (const node of textNodes) {

        const input = getNodeText(node);

        if(input == null || isWhitespace(input))
        {
            continue;
        }

        // text is too large to translate in bulk
        if (input.length >= BULK_TRANSLATION_COMBINED_TEXT_LENGTH) {
            try {
                const output = await translateLargeSingleText(input);
                setNodeText(node, output);
            } catch (e) {
                return;
            }
            continue;
        }

        // node can't fit, don't bulk translate it. translate what we have now
        if (currentCombinedTextLength + input.length > BULK_TRANSLATION_COMBINED_TEXT_LENGTH) {
            try {
                await bulkTranslateNodes(bulkTranslatedNodes);
            } catch (e) {
                return;
            }
            bulkTranslatedNodes = []
            currentCombinedTextLength = 0;
            continue;
        }

        bulkTranslatedNodes.push(node);
        currentCombinedTextLength += input.length;
    }

    try {
        await bulkTranslateNodes(bulkTranslatedNodes);
    } catch (e) {
        return;
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
        throw e;
    }
})();