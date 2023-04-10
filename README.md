# chat-gpt-translator-extension
chrome extension to use chat gpt translator to translate text on screen to english

click on the extension icon in the toolbar to begin translating. Need to set chat gpt api-key via extension settings. uses gpt-turbo-3 model.
Extension skeleton was generated with gpt4, and much of the extension code comes from https://github.com/CabbageSlices/gpt-english-translator, but modified to work 
as a bowser extension instead. 

This is meant to be used to read untranslated web novels. so it doesn't translate every single line on webpage properly like google translate extension does. It assumes that if a div has a bunch of paragraph or pure text elements as children, then the all the text inside should be translated together. This is because most web novel sites put the chapter content inside of a div, and each sentance is either a basic text node, or contained inside paragraph tags, so generally it's safe to assume if a div has a lot of text, then it's a novel chapter and can be translated together. 

### Installation

Either download and install the Translator.extension.crx file from the releases section, or download the source code and install as unpacked.

To install in Chrome browser:
0. Download the Translator.extension.crx file from the releases section, or the source code and extract it somewhere.
1. type in chrome://extensions/ in your chrome browser and hit enter to open the chrome extensions page
2. enable developer mode in the top right corner of the screen.
3. Either drag the Translator.extension.crx file to the chrome extensions page, or click on the "load unpacked" button in the chrome extensions page, and in the folder select menu navigate to the downloaded source code folder, and select the directory where the manifest.json file is located.

### OpenAI API Key Setup

OpenAI API key is **Required** to use this extension. To Setup an API key:

1. Head to the [OpenAI Website](https://platform.openai.com/) and sign up for an account.
2. Once you have an account and are signed in, go to https://platform.openai.com/account/api-keys and click on Create a new Secret key to generate a an API key.
3. Make sure to copy the generated key down, OpenAI won't dispaly it again.
4. *optional* Add a [payment method](https://platform.openai.com/account/billing/overview). New users have free credits so as long as you don't use too much you shouldn't need to pay.

New users should have free usage credits and can possibly get away with not paying for OpenAI api usage.  

Once you have an API key, open the extension settings for ChatGPT translator. In chrome you can view the extension details for ChatGPT translator, and then select extension options to open the settings page. Copy and paste your API key here, and save it. The API key is saved to chrome's synced storage, so it'll be available on all chrome browsers. 

### Usage

1. Head to any webpage you want to translate. Here is [The Reincarnated Villain Makes The Heroines Tearfully Beg for Forgiveness Chapter 1](https://wap.faloo.com/1100442_1.html) for example.
2. From the browser toolbar click on the ChatGPT Translator to begin translating to english.
3. Text Currently being translated will be highlighted in red.
<img src="https://i.imgur.com/O6r7CTB.png" width="400" height="440" />
4. Once translation is finished, you will see a popup.


### Issues
- Translation is MUCH slower than google translate. It will typically take atleast 5-10 seconds to translate, and longer depending on how much text there is on screen.
- Sometimes ChatGPT api will give you a summary of the text instead of a just translating. In this case you'll have to refresh the page and translate again.
- Translation might fail and leave text highlighted red. In particular translation will typically fail for small menu text. 


### Credits

translation icon: [Translation icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/translation)
