const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').ApiKey
const sentenceBondaryDetection = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu.json').apikey
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
 
const nlu = new NaturalLanguageUnderstandingV1({
    url: 'https://api.us-south.natural-language-understanding.watson.cloud.ibm.com/instances/5c25b70b-4f65-4302-8ff6-2ca3f05176db',
    version: '2020-08-19',
    iam_apikey: watsonApiKey
})

const state = require('./state.js')

async function robot() {
    const content = state.load()

    await fetchContentFromWikipedia(content)
    sanitizeContent(content)
    breakContentIntoSentences(content)
    limitMaximumSentences(content)
    await fetchKeywordsOfAllSentences(content)
    
    state.save(content)

    async function fetchContentFromWikipedia(content) {
        const algorithmiaAutenticated = algorithmia(algorithmiaApiKey)
        const wikipediaAlgorithm = algorithmiaAutenticated.algo('web/WikipediaParser/0.1.2')
        const wikipediaResponse = await  wikipediaAlgorithm.pipe(content.searchTerm)
        const WikipediaContent = wikipediaResponse.get()
    
        content.sourceContentOriginal = WikipediaContent.content
    }

    function sanitizeContent(content) {
        const withoutBlankLinesAndMarkdown = removerBlankLinesAndMarkdown(content.sourceContentOriginal)
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown)
        content.sourceContentSanitized = withoutDatesInParentheses

        function removerBlankLinesAndMarkdown(text) {
            const allLines = text.split('\n')
            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                if (line.trim().length === 0 || line.trim().startsWith('=')) {
                    return false
                }
                return true
            })

            return withoutBlankLinesAndMarkdown.join(' ')
        }
    }
    function removeDatesInParentheses(text) {
        return text.replace(/\((?:\([^()]*\}|[^()])*\)/gm, '').replace(/  /g, ' ')
    }

    function breakContentIntoSentences() {
        content.sentences = []
        
        const sentences = sentenceBondaryDetection.sentences(content.sourceContentSanitized)
        sentences.forEach((sentence) => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }

    function limitMaximumSentences(content) {
        content.sentences = content.sentences.slice(0, content.maximumSentences)
    }

    async function fetchKeywordsOfAllSentences(content) {
        for (const sentence of content.sentences) {
            sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)
        }
    }

    async function fetchWatsonAndReturnKeywords(sentence) {
        return new Promise((resolve, reject) => {
            nlu.analyze({
                text: sentence,
                features: {
                    keywords: {}
                }
            }, (error, response) => {
                if (error) {
                    throw error
                }
                
                const keywords = response.keywords.map((keyword) => {
                    return keyword.text
                })

                resolve(keywords)
            })
        })
    }
}

module.exports = robot