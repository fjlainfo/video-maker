const google = require('googleapis').google
const custonSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')
const { sentences } = require('sbd')

async function robot() {
    const content = state.load()
    // const imagesArray = await fetchGoogleAndReturnImagesLinks('Michael Jackson')
    // console.dir(imagesArray, { depth: null })
    // process.exit(0)
    await fetchImagesOfAllSentences(content)

    state.save(content)

    async function fetchImagesOfAllSentences(content){
        for (const sentence of content.sentences) {
            const query = `${content.searchTerm} ${sentence.keywords[0]}`
            sentence.images = await fetchGoogleAndReturnImagesLinks(query)

            sentence.googleSearchQuery = query
        }   
    }

    async function fetchGoogleAndReturnImagesLinks(query) {
        const response = await custonSearch.cse.list({
            auth: googleSearchCredentials.ApiKey,
            cx: googleSearchCredentials.SearchEngineId,
            q: query,
            searchType: 'image',
            num: 2
        })

        const imagesUrl = response.data.items.map((item) => {
            return item.link
        })

    return imagesUrl
    }
}

module.exports = robot