const fs = require('fs')
const fsPromises = require('fs/promises')
const {createHash} = require('crypto')
const path = require('path')

let sitemapCache

async function sitemap(req, res) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    if (sitemapCache) return res.send(sitemapCache)
    console.log('building sitemap')

    let xml = '<?xml version="1.0" encoding="UTF-8"?>'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    const domain = 'https://gesetze-im-internet-aber-schoen.info'

    xml += '<url>'
    xml += `<loc>${domain}</loc>`
    xml += `<lastmod>2022-08-24</lastmod>`
    xml += '</url>'

    xml += '<url>'
    xml += `<loc>${domain}/%C3%BCber</loc>`
    xml += `<lastmod>2022-08-04</lastmod>`
    xml += '</url>'

    const knownLastModifiedPath = path.join(__dirname, '..', 'scraper/data/lastMod.json')
    const routes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scraper/data/routes.json'), {encoding: 'utf8'}))
    const knownLastModified = fs.existsSync(knownLastModifiedPath)
        ? JSON.parse(fs.readFileSync(knownLastModifiedPath, {encoding: 'utf8'}))
        : {}

    async function getLastModified(jsonPath) {
        const fullPath = path.join(__dirname, '..', `scraper/data/laws/${routes[jsonPath]}`)
        const content = fs.readFileSync(fullPath, {encoding: 'utf8'})
        const contentHash = createHash('md5').update(content).digest('hex')
        if (!knownLastModified[contentHash]) {
            knownLastModified[contentHash] = (await fsPromises.stat(fullPath))
                .mtime.toISOString().replace(/T[\d:.]+Z/, '')
        }
        return knownLastModified[contentHash]
    }

    await Promise.all(Array.from(Object.keys(routes)).map(async route => {
        const lastMod = await getLastModified(route)
        xml += '<url>' +
            `<loc>${domain}/${route}</loc>` +
            `<lastmod>${lastMod}</lastmod>` +
            '</url>'
    }))
    xml += '</urlset>'
    res.send(xml)

    sitemapCache = xml
    fs.writeFileSync(knownLastModifiedPath, JSON.stringify(knownLastModified), {encoding: 'utf8'})
    fs.writeFileSync(path.join(__dirname, '..', 'build/sitemap.xml'), xml, {encoding: 'utf8'})
}

module.exports = sitemap
