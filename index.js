const get = require('lodash/get')
const join = require('lodash/join')
const toUpper = require('lodash/toUpper')
const head = require('lodash/head')
const axios = require('axios')
const cron = require('node-cron')
const express = require('express')
const cheerio = require('cheerio')

// Test channel HOOK //
// const hook = 'T1192U9B4/B013R0CF2H3/BQWBiYadgT23swOdqm0X3dt9'

const hook = 'T1192U9B4/B013BJYBYEB/i6xOTtiSWpwJg0xRxYBeOWuZ'
const API_key = '5b692760-b0cd-4273-9878-f3bf88558a90'
const wordOfTheDayUrl = 'https://www.merriam-webster.com/word-of-the-day'
const PORT = process.env.PORT || 5000

/// Initiate server ///
const app = express();

app.get('/', (req, res) => res.send('Word of the day'))

app.listen(PORT)

/// Get the word of the day from the website ///
const getWordOfTheDay = async () => {
  const result = await axios.get(wordOfTheDayUrl)
  const $ = cheerio.load(result.data)
  return ({word: $('h1').text(), example: $('.wotd-examples > p:first-of-type').text(), didYouKnow: $('.left-content-box p').text()})
}

/// Send request to dictionary API ///
const getData = async (word) => {
    const json = await axios({
        url: `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${API_key}`,
    })
    return json.data.map(meaning => ({
        type: get(meaning, 'fl', ''), //part of the speech
        pronunciation: get(meaning, 'hwi.prs[0].mw', ''), //pronunciation
        definitions: meaning.shortdef, //array of definitions
        art: get(meaning, 'art.artid', ''), //illustration
    }))
}

/// Methods that build the slack message ////
const pronunc = entries => head(entries.map(entry => entry.pronunciation))

const definition = meaning => join(meaning.definitions.map(definition => (`• ${definition}`)), '\n')

const illustrationUrl = artId => `https://www.merriam-webster.com/assets/mw/static/art/dict/${artId}.gif`

const section = meaning => ({
    type: "section",
    text: {
        type: "mrkdwn",
        text: `_*${meaning.type}*_\n ${definition(meaning)}`
    },
    ...(meaning.art && {
        accessory: {
        type: "image",
        image_url: illustrationUrl(meaning.art),
        alt_text: " ",
        }})
})

const message = (word, example, didYouKnow, entries) => JSON.stringify({
    blocks: [
        {
            type: "divider"
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*${word}* _${pronunc(entries)}_`
            }
        },
        {
            type: "divider"
        },
    ].concat(entries.map(entry => section(entry))).concat({        
        type: "section",
        text: {
            type: "mrkdwn",
            text: `_${example}_`
        }
    ,}).concat({        
        type: "section",
        text: {
            type: "mrkdwn",
            text: `*_Did you know?_*\n ${didYouKnow}`
        }
    ,})
})

/// Main function ///
const main = async () => {
    try {
        // get today's word of the day
        const wordOfTheDay = await getWordOfTheDay()
        const word = wordOfTheDay.word
        const example = wordOfTheDay.example
        const didYouKnow = wordOfTheDay.didYouKnow

        // get the data
        const entries = await getData(word)

        //post to slack
        const res = await axios({
            url: `https://hooks.slack.com/services/${hook}`,
            method: 'POST',
            data: message(word, example, didYouKnow, entries),
        })

        console.log('Word of the day sent!!')
    } catch (e) {
        console.log('error', e)
    }
}

// Schedule task in UCT time
cron.schedule('0 7 * * *', () => main())