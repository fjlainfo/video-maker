const imageDownloader = require('image-downloader')
const gm = require('gm').subClass({imageMagick: true})
const google = require('googleapis').google
const custonSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')
const { sentences } = require('sbd')

async function robot() {
    const content = state.load()
    
    await fetchImagesOfAllSentences(content)
    await downloadAllImages(content)
    await convertAllImages(content)
    await creatAllSentenceImages(content)
    await creatYouTubeThumbnail()
    
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

    async function downloadAllImages(content) {
        content.downloadImages = []

        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
            const images = content.sentences[sentenceIndex].images

            for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
                const imageUrl = images[imageIndex]

                try {
                    if(content.downloadImages.includes(imageUrl)) {
                        throw new Error('Imagem já foi baixada')
                    }
                    await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`)
                    content.downloadImages.push(imageUrl)
                    console.log(`> {${sentenceIndex}} {${imageIndex}} Baixou Imagem com sucesso: ${imageUrl}`)
                    break
                } catch (error) {
                    console.log(`> {${sentenceIndex}} {${imageIndex}} Erro ao Baixar: ${imageUrl}: ${error}`)
                }
            }
        }
    }

    async function downloadAndSave(url, fileName) {
        return imageDownloader.image({
            url: url,
            dest: `./content/${fileName}`
        })
    }

    async function convertAllImages(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await convertImage(sentenceIndex)
        }

        async function convertImage(sentenceIndex) {
            return new Promise((resolve, reject) => {
                const inputFIle = `./content/${sentenceIndex}-original.png[0]`
                const outputFIle = `./content/${sentenceIndex}-converted.png`
                const width = 1920
                const height = 1080

                gm()
                    .in(inputFIle)
                        .out('(')
                            .out('-clone')
                            .out('0')
                            .out('-background', 'white')
                            .out('-blur', '0x9')
                            .out('-resize', `${width}x${height}^`)
                        .out(')')
                        .out('(')
                            .out('-clone')
                            .out('0')
                            .out('-background', 'white')
                            .out('-resize', `${width}x${height}`)
                        .out(')')
                        .out('-delete', '0')
                        .out('-gravity', 'center')
                        .out('-compose', 'over')
                        .out('-composite', )
                        .out('-extent', `${width}X${height}`)
                        .write(outputFIle, (error) => {
                            if (error) {
                                return reject(error)
                            }
                            console.log(`> image converted: ${inputFIle}`)
                            resolve()
                        })
            })
        }
    }

    async function creatAllSentenceImages(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await creatSentenceImages(sentenceIndex, content.sentences[sentenceIndex].text)
        }

        async function creatSentenceImages (sentenceIndex, sentenceText) {
            return new Promise ((resolve, reject) => {
                const outPutFile = `./content/${sentenceIndex}-sentence.png`

                const tempaletSettings = {
                    0: {
                        size: '1920x400',
                        gravity: 'center'
                    },
                    1: {
                        size: '1920x1080',
                        gravity: 'center'
                    },
                    2: {
                        size: '800x400',
                        gravity: 'west'
                    },
                    3: {
                        size: '1920x400',
                        gravity: 'center'
                    },
                    4: {
                        size: '1920x1080',
                        gravity: 'center'
                    },
                    5: {
                        size: '800x400',
                        gravity: 'west'
                    },
                    6: {
                        size: '1920x400',
                        gravity: 'center'
                    }
                }

                gm()
                    .out('-size', tempaletSettings[sentenceIndex].size)
                    .out('-gravity', tempaletSettings[sentenceIndex].gravity)
                    .out('-background', 'transparent')
                    .out('-fill', 'white')
                    .out('-kerning', '-1')
                    .out(`caption:${sentenceText}`)
                    .write(outPutFile, (error) =>{
                        if (error) {
                            return reject(error)
                        }

                        console.log(`> sentence created: ${outPutFile}`)
                        resolve()
                    })
            })
        }
    }

    async function creatYouTubeThumbnail() {
        return new Promise ((resolve, reject) => {
            gm()
                .in('./content/0-converted.png')
                .write('./content/youtube-thumbnail.jpg', (error) => {
                    if(error) {
                        return reject(error)
                    }

                    console.log('> Createing YouTube Thumbnail')
                    resolve()
                })
        })
    }
}

module.exports = robot