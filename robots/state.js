const fs = require('fs')
const contenteFilePath = './content.json'

function save(content) {
    const contentString = JSON.stringify(content)
    return fs.writeFileSync(contenteFilePath, contentString)
}

function load() {
    const fileBuffer = fs.readFileSync(contenteFilePath, 'utf-8')
    const contentJson = JSON.parse(fileBuffer)
    return contentJson
}

module.exports = {save,load}