# chat-gpt-translator-extension
chrome extension to use chat gpt translator to translate text on screen to english

click on the extension icon in the toolbar to begin translating. Need to set chat gpt api-key via extension settings. uses gpt-turbo-3 model.
Extension skeleton was generated with gpt4, and much of the extension code comes from https://github.com/CabbageSlices/gpt-english-translator, but modified to work 
as a bowser extension instead. 

This is meant to be used to read untranslated web novels. so it doesn't translate every single line on webpage properly like google translate extension does. It assumes that if a div has a bunch of paragraph or pure text elements as children, then the all the text inside should be translated together. This is because most web novel sites put the chapter content inside of a div, and each sentance is either a basic text node, or contained inside <p></p> tags, so generally it's safe to assume if a div has a lot of text, then it's a novel chapter and can be translated together. 
